import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoidRequest {
  redemption_id: string;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile to check admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.is_admin === true;

    // Get user's venue memberships
    const { data: memberships } = await supabase
      .from("venue_memberships")
      .select("venue_id, role")
      .eq("profile_id", user.id);

    const userVenueIds = memberships?.map(m => m.venue_id) || [];

    // Parse request body
    const body: VoidRequest = await req.json();
    const { redemption_id, reason } = body;

    if (!redemption_id) {
      return new Response(
        JSON.stringify({ error: "redemption_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "reason is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the redemption
    const { data: redemption, error: fetchError } = await supabase
      .from("redemptions")
      .select("id, venue_id, redeemed_at, status")
      .eq("id", redemption_id)
      .single();

    if (fetchError || !redemption) {
      return new Response(
        JSON.stringify({ error: "Redemption not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already voided
    if (redemption.status === "void") {
      return new Response(
        JSON.stringify({ error: "Redemption is already voided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization check
    const canVoid = isAdmin || userVenueIds.includes(redemption.venue_id);
    if (!canVoid) {
      return new Response(
        JSON.stringify({ error: "Not authorized to void this redemption" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Time limit check for non-admins (24 hours)
    if (!isAdmin) {
      const redeemedAt = new Date(redemption.redeemed_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - redeemedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        return new Response(
          JSON.stringify({ error: "Staff can only void redemptions within 24 hours" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Perform the void
    const voidedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("redemptions")
      .update({
        status: "void",
        metadata: {
          voided_at: voidedAt,
          voided_by: user.id,
          void_reason: reason.trim(),
        },
      })
      .eq("id", redemption_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to void redemption" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        redemption_id,
        voided_at: voidedAt,
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
