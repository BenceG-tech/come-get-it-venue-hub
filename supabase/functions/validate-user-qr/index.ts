import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This endpoint is called by POS systems (Goorderz) with an API key
    const apiKey = req.headers.get("X-API-Key");
    const expectedApiKey = Deno.env.get("GOORDERZ_API_KEY");

    // For now, also allow service role key for testing
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const isServiceRole = authHeader?.includes(serviceKey || "impossible-match");
    const isValidApiKey = expectedApiKey && apiKey === expectedApiKey;

    if (!isServiceRole && !isValidApiKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, venue_id } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the provided token to compare with stored hash
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find the token
    const { data: tokenData, error: tokenError } = await serviceClient
      .from("user_qr_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "TOKEN_NOT_FOUND", message: "Invalid or expired token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Clean up expired token
      await serviceClient
        .from("user_qr_tokens")
        .delete()
        .eq("id", tokenData.id);

      return new Response(
        JSON.stringify({ error: "TOKEN_EXPIRED", message: "Token has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already used
    if (tokenData.used_at) {
      return new Response(
        JSON.stringify({ error: "TOKEN_ALREADY_USED", message: "Token has already been used" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used
    await serviceClient
      .from("user_qr_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Get user info
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("name")
      .eq("id", tokenData.user_id)
      .single();

    // Get user points
    const { data: points } = await serviceClient
      .from("user_points")
      .select("balance")
      .eq("user_id", tokenData.user_id)
      .single();

    return new Response(
      JSON.stringify({
        valid: true,
        user_id: tokenData.user_id,
        user_name: profile?.name || "User",
        points_balance: points?.balance || 0,
        validated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
