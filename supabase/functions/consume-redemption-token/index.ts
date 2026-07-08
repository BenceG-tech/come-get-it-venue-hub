import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsumeTokenRequest {
  token: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Hash token with SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Validate token format: CGI-XXXXXX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
function isValidTokenFormat(token: string): boolean {
  const regex = /^CGI-[A-Z0-9]{6}-[A-Za-z0-9]{32}$/;
  return regex.test(token);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Validate staff authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Unauthorized - Missing authorization header", code: "NO_AUTH", action: "A POS/Rork scanner oldalon bejelentkezett staff JWT-t kell küldeni Authorization Bearer headerben." }, 401);
    }

    // Create client with user's auth context
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ success: false, error: "Unauthorized - Invalid token", code: "INVALID_AUTH", action: "Jelentkeztesd be újra a staff felhasználót a POS oldalon." }, 401);
    }

    const staffId = claimsData.claims.sub as string;

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Check staff's venue memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("venue_memberships")
      .select("venue_id, role")
      .eq("profile_id", staffId);

    // Also check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", staffId)
      .single();

    const isAdmin = profile?.is_admin === true;
    const staffVenueIds = memberships?.map((m) => m.venue_id) || [];

    if (!isAdmin && staffVenueIds.length === 0) {
      return jsonResponse({ success: false, error: "Unauthorized - Not a staff member", code: "NOT_STAFF", action: "Add hozzá ezt a felhasználót venue_memberships rekordként a helyszínhez, vagy adj neki admin jogosultságot." }, 403);
    }

    // 3. Parse request body
    const body: ConsumeTokenRequest = await req.json();
    const { token: redemptionToken } = body;

    if (!redemptionToken) {
      return jsonResponse({ success: false, error: "Token is required", code: "TOKEN_REQUIRED" }, 400);
    }

    // 4. Validate token format
    if (!isValidTokenFormat(redemptionToken)) {
      return jsonResponse({ success: false, error: "Invalid token format", code: "INVALID_FORMAT", action: "A teljes CGI-XXXXXX-... tokent kell QR-kódba tenni, nem csak a prefixet." }, 400);
    }

    // 5. Hash the token and look it up
    const tokenHash = await hashToken(redemptionToken);

    const { data: tokenData, error: tokenError } = await supabase
      .from("redemption_tokens")
      .select(`
        id,
        venue_id,
        drink_id,
        user_id,
        token_prefix,
        status,
        expires_at,
        issued_at,
        consumed_at
      `)
      .eq("token_hash", tokenHash)
      .single();

    if (tokenError || !tokenData) {
      return jsonResponse({ success: false, error: "Token not found", code: "NOT_FOUND", action: "Generálj új QR tokent az appban, majd azt olvasd be." }, 404);
    }

    // 6. Check if staff is authorized for this venue
    if (!isAdmin && !staffVenueIds.includes(tokenData.venue_id)) {
      return jsonResponse({ success: false, error: "Not authorized for this venue", code: "VENUE_UNAUTHORIZED", action: "A bejelentkezett staff nincs hozzárendelve ahhoz a helyszínhez, amelyhez a QR token tartozik." }, 403);
    }

    // 7. Check token status
    if (tokenData.status === "consumed") {
      return jsonResponse({ 
          success: false, 
          error: "Token already consumed", 
          code: "ALREADY_CONSUMED",
          consumed_at: tokenData.consumed_at,
          action: "Ez a QR már sikeresen be lett váltva. Kérj új tokent az appban."
        }, 409);
    }

    if (tokenData.status === "expired" || tokenData.status === "revoked") {
      return jsonResponse({ success: false, error: `Token is ${tokenData.status}`, code: "INVALID_STATUS", action: "Generálj új QR tokent az appban." }, 410);
    }

    // 8. Check expiration
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      // Update token status to expired
      await supabase
        .from("redemption_tokens")
        .update({ status: "expired" })
        .eq("id", tokenData.id);

      return jsonResponse({ success: false, error: "Token has expired", code: "EXPIRED", action: "A token 2 percig él. Generálj új QR tokent, majd azonnal olvasd be." }, 410);
    }

    // 9. Get drink and venue details
    const { data: drink } = await supabase
      .from("venue_drinks")
      .select("id, drink_name, image_url, category")
      .eq("id", tokenData.drink_id)
      .single();

    const { data: venue } = await supabase
      .from("venues")
      .select("id, name")
      .eq("id", tokenData.venue_id)
      .single();

    // 10. Consume the token - update status
    const { error: updateError } = await supabase
      .from("redemption_tokens")
      .update({
        status: "consumed",
        consumed_at: now.toISOString(),
        consumed_by_staff_id: staffId,
      })
      .eq("id", tokenData.id);

    if (updateError) {
      console.error("Error updating token:", updateError);
      return jsonResponse({ success: false, error: "Failed to consume token", code: "TOKEN_CONSUME_FAILED" }, 500);
    }

    // 11. Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from("redemptions")
      .insert({
        venue_id: tokenData.venue_id,
        user_id: tokenData.user_id || staffId, // Use token's user_id or staff as fallback
        drink: drink?.drink_name || "Unknown Drink",
        drink_id: tokenData.drink_id,
        value: 0, // Free drink
        token_id: tokenData.id,
        staff_id: staffId,
        redeemed_at: now.toISOString(),
      })
      .select()
      .single();

    if (redemptionError) {
      console.error("Error creating redemption:", redemptionError);
      // Token is already consumed, but log the error
    } else if (redemption?.id) {
      // Trigger async matching (don't await)
      const matchUrl = `${supabaseUrl}/functions/v1/match-redemption-transaction`;
      fetch(matchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ redemption_id: redemption.id })
      }).catch(err => console.error('Matching trigger failed:', err));
    }

    // 12. Return success response
    return jsonResponse({
        success: true,
        redemption: {
          id: redemption?.id,
          drink_name: drink?.drink_name,
          drink_id: drink?.id,
          drink_image_url: drink?.image_url,
          venue_name: venue?.name,
          venue_id: venue?.id,
          token_prefix: tokenData.token_prefix,
          redeemed_at: now.toISOString(),
          staff_id: staffId,
        },
      }, 200);

  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
  }
});
