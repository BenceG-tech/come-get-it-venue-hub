import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsumeTokenRequest {
  token: string;
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
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth context
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Not a staff member" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body: ConsumeTokenRequest = await req.json();
    const { token: redemptionToken } = body;

    if (!redemptionToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validate token format
    if (!isValidTokenFormat(redemptionToken)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token format", code: "INVALID_FORMAT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ success: false, error: "Token not found", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Check if staff is authorized for this venue
    if (!isAdmin && !staffVenueIds.includes(tokenData.venue_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authorized for this venue", code: "VENUE_UNAUTHORIZED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Check token status
    if (tokenData.status === "consumed") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token already consumed", 
          code: "ALREADY_CONSUMED",
          consumed_at: tokenData.consumed_at
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenData.status === "expired" || tokenData.status === "revoked") {
      return new Response(
        JSON.stringify({ success: false, error: `Token is ${tokenData.status}`, code: "INVALID_STATUS" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      return new Response(
        JSON.stringify({ success: false, error: "Token has expired", code: "EXPIRED" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ success: false, error: "Failed to consume token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    }

    // 11b. Create charity donation (if redemption succeeded)
    let charityImpact = null;
    if (redemption && tokenData.user_id) {
      try {
        // Get active charity partner (highest priority)
        const { data: charityPartner } = await supabase
          .from("charity_partners")
          .select("id, name, impact_unit, huf_per_unit")
          .eq("is_active", true)
          .order("priority", { ascending: false })
          .limit(1)
          .single();

        if (charityPartner) {
          // Calculate donation: 100 HUF total (50 platform, 50 venue)
          const totalDonation = 100;
          const platformShare = 50;
          const venueShare = 50;
          const impactUnits = Math.floor(totalDonation / charityPartner.huf_per_unit);
          const impactDescription = impactUnits > 1
            ? `${impactUnits} ${charityPartner.impact_unit}`
            : `1 ${charityPartner.impact_unit}`;

          // Insert charity donation record
          const { data: donation, error: donationError } = await supabase
            .from("charity_donations")
            .insert({
              redemption_id: redemption.id,
              user_id: tokenData.user_id,
              venue_id: tokenData.venue_id,
              platform_contribution_huf: platformShare,
              venue_contribution_huf: venueShare,
              total_donation_huf: totalDonation,
              charity_partner_id: charityPartner.id,
              charity_name: charityPartner.name,
              impact_units: impactUnits,
              impact_description: impactDescription,
            })
            .select()
            .single();

          if (!donationError && donation) {
            // Update user CSR stats
            await supabase.rpc("update_user_csr_stats", {
              p_user_id: tokenData.user_id,
              p_donation_amount: totalDonation,
              p_impact_units: impactUnits,
              p_donation_date: now.toISOString().split('T')[0], // YYYY-MM-DD
            });

            charityImpact = {
              donation_huf: totalDonation,
              impact_description: impactDescription,
              charity_name: charityPartner.name,
            };
          } else if (donationError) {
            console.error("Charity donation error:", donationError);
          }
        }
      } catch (charityError) {
        // Don't fail the redemption if charity tracking fails
        console.error("Charity tracking failed:", charityError);
      }
    }

    // 12. Return success response
    return new Response(
      JSON.stringify({
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
        charity_impact: charityImpact,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
