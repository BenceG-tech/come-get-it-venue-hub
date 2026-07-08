import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const TOKEN_REGEX = /^CGI-[A-Z0-9]{6}-[A-Za-z0-9]{32}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, error: "Unauthorized", code: "NO_AUTH" }, 401);
    }

    const supaAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supaAuth.auth.getClaims(jwt);
    if (claimsErr || !claimsData?.claims) {
      return json({ success: false, error: "Invalid token", code: "INVALID_AUTH" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { token } = body ?? {};

    if (!token || typeof token !== "string" || !TOKEN_REGEX.test(token)) {
      return json({ success: false, error: "Invalid token format", code: "INVALID_FORMAT" }, 400);
    }

    const token_hash = await sha256(token);

    const { data: tokenRow, error: tErr } = await supabase
      .from("redemption_tokens")
      .select("id, venue_id, drink_id, user_id, status, expires_at, consumed_at")
      .eq("token_hash", token_hash)
      .maybeSingle();
    if (tErr || !tokenRow) return json({ success: false, error: "Token not found", code: "NOT_FOUND" }, 404);

    // Admin bypass on ownership
    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", userId).single();
    const isAdmin = profile?.is_admin === true;

    if (!isAdmin && tokenRow.user_id && tokenRow.user_id !== userId) {
      return json({ success: false, error: "Not token owner", code: "NOT_OWNER" }, 403);
    }

    if (tokenRow.status === "consumed") {
      return json({ success: false, error: "Already consumed", code: "ALREADY_CONSUMED", consumed_at: tokenRow.consumed_at }, 409);
    }
    if (tokenRow.status === "expired" || tokenRow.status === "revoked") {
      return json({ success: false, error: `Token ${tokenRow.status}`, code: "INVALID_STATUS" }, 410);
    }

    const now = new Date();
    if (new Date(tokenRow.expires_at) < now) {
      await supabase.from("redemption_tokens").update({ status: "expired" }).eq("id", tokenRow.id);
      return json({ success: false, error: "Token expired", code: "EXPIRED" }, 410);
    }

    // Load drink + venue
    const { data: drink } = await supabase
      .from("venue_drinks").select("id, drink_name, image_url, category").eq("id", tokenRow.drink_id).maybeSingle();
    const { data: venue } = await supabase
      .from("venues").select("id, name, csr_enabled, default_charity_id, donation_per_redemption").eq("id", tokenRow.venue_id).maybeSingle();

    // Consume token
    const { error: updErr } = await supabase
      .from("redemption_tokens")
      .update({ status: "consumed", consumed_at: now.toISOString(), consumed_by_staff_id: userId })
      .eq("id", tokenRow.id);
    if (updErr) {
      console.error("consume update failed", updErr);
      return json({ success: false, error: "Failed to consume token", code: "TOKEN_CONSUME_FAILED" }, 500);
    }

    // Insert redemption
    const { data: redemption, error: rErr } = await supabase
      .from("redemptions")
      .insert({
        venue_id: tokenRow.venue_id,
        user_id: tokenRow.user_id ?? userId,
        drink: drink?.drink_name ?? "Unknown Drink",
        drink_id: tokenRow.drink_id,
        value: 0,
        token_id: tokenRow.id,
        redeemed_at: now.toISOString(),
        status: "redeemed",
        metadata: { flow: "guest_button" },
      }).select("id").single();

    if (rErr) console.error("redemption insert failed", rErr);

    // CSR donation
    let impact_delta = 0;
    let total_impact_units = 0;
    let impact_message = "";
    if (venue?.csr_enabled && venue?.default_charity_id && redemption?.id) {
      const amount = venue.donation_per_redemption ?? 250;
      await supabase.from("csr_donations").insert({
        redemption_id: redemption.id,
        user_id: tokenRow.user_id ?? userId,
        venue_id: tokenRow.venue_id,
        charity_id: venue.default_charity_id,
        amount_huf: amount,
      });
      impact_delta = 1;
      impact_message = "+1 ember kap ma tiszta vizet";
      const { count } = await supabase
        .from("csr_donations").select("id", { count: "exact", head: true })
        .eq("charity_id", venue.default_charity_id);
      total_impact_units = count ?? 0;
    }

    // Async matching trigger
    if (redemption?.id) {
      const matchUrl = `${supabaseUrl}/functions/v1/match-redemption-transaction`;
      fetch(matchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ redemption_id: redemption.id }),
      }).catch((err) => console.error("match trigger failed", err));
    }

    return json({
      success: true,
      redemption_id: redemption?.id,
      impact_delta,
      impact_message,
      total_impact_units,
    });
  } catch (e) {
    console.error("unexpected", e);
    return json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
  }
});
