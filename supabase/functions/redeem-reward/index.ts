import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateRedemptionCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return `CGI-${code}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { reward_id, venue_id } = await req.json();

    if (!reward_id) {
      return new Response(
        JSON.stringify({ error: "MISSING_REWARD_ID", message: "Reward ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get reward details
    const { data: reward, error: rewardError } = await serviceClient
      .from("rewards")
      .select("*")
      .eq("id", reward_id)
      .single();

    if (rewardError || !reward) {
      return new Response(
        JSON.stringify({ error: "REWARD_NOT_FOUND", message: "Reward not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if reward is active
    if (!reward.active) {
      return new Response(
        JSON.stringify({ error: "REWARD_INACTIVE", message: "This reward is no longer active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if reward has expired
    if (new Date(reward.valid_until) < new Date()) {
      return new Response(
        JSON.stringify({ error: "REWARD_EXPIRED", message: "This reward has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max redemptions
    if (reward.max_redemptions && reward.current_redemptions >= reward.max_redemptions) {
      return new Response(
        JSON.stringify({ error: "REWARD_LIMIT_REACHED", message: "This reward has reached its maximum redemptions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user points
    const { data: pointsData } = await serviceClient
      .from("user_points")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const currentBalance = pointsData?.balance || 0;

    // Check if user has enough points
    if (currentBalance < reward.points_required) {
      return new Response(
        JSON.stringify({
          error: "INSUFFICIENT_POINTS",
          message: `Not enough points. You have ${currentBalance}, but need ${reward.points_required}`,
          current_balance: currentBalance,
          required_points: reward.points_required,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct points using the modify_user_points function
    const { data: newBalance, error: pointsError } = await serviceClient
      .rpc("modify_user_points", {
        p_user_id: user.id,
        p_amount: -reward.points_required,
        p_type: "spend_reward",
        p_reference_type: "reward",
        p_reference_id: reward.id,
        p_venue_id: venue_id || reward.venue_id,
        p_description: `Beváltás: ${reward.name}`,
      });

    if (pointsError) {
      console.error("Points deduction error:", pointsError);
      return new Response(
        JSON.stringify({ error: "POINTS_ERROR", message: "Failed to deduct points" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate redemption code
    const redemptionCode = generateRedemptionCode();

    // Create reward redemption record
    const { error: redemptionError } = await serviceClient
      .from("reward_redemptions")
      .insert({
        reward_id: reward.id,
        user_id: user.id,
        venue_id: venue_id || reward.venue_id,
        notes: `Redemption code: ${redemptionCode}`,
      });

    if (redemptionError) {
      console.error("Redemption record error:", redemptionError);
      // Don't fail the request, points are already deducted
    }

    // Increment current_redemptions on the reward
    await serviceClient
      .from("rewards")
      .update({ current_redemptions: (reward.current_redemptions || 0) + 1 })
      .eq("id", reward.id);

    return new Response(
      JSON.stringify({
        success: true,
        redemption_code: redemptionCode,
        reward_name: reward.name,
        points_spent: reward.points_required,
        new_balance: newBalance,
        message: "Reward successfully redeemed!",
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
