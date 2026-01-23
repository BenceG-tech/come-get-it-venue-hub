import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendRewardRequest {
  milestone_id: string;
  reward_type: "free_drink" | "free_dessert" | "bonus_points" | "discount_coupon" | "custom";
  points_amount?: number;
  message?: string;
  dismiss_only?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status
    const { data: profile } = await supabaseAuth.from("profiles").select("is_admin").eq("id", authUser.id).single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendRewardRequest = await req.json();
    const { milestone_id, reward_type, points_amount, message, dismiss_only } = body;

    if (!milestone_id) {
      return new Response(JSON.stringify({ error: "milestone_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get milestone details
    const { data: milestone, error: milestoneError } = await supabase
      .from("loyalty_milestones")
      .select("*")
      .eq("id", milestone_id)
      .single();

    if (milestoneError || !milestone) {
      return new Response(JSON.stringify({ error: "Milestone not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If just dismissing
    if (dismiss_only) {
      await supabase
        .from("loyalty_milestones")
        .update({
          admin_notified: true,
          admin_dismissed: true,
        })
        .eq("id", milestone_id);

      return new Response(JSON.stringify({ success: true, action: "dismissed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process reward
    const rewardLabels: Record<string, string> = {
      free_drink: "Ingyen ital",
      free_dessert: "Ingyen desszert",
      bonus_points: `${points_amount || 50} bónusz pont`,
      discount_coupon: "10% kedvezmény kupon",
      custom: message || "Egyéni jutalom",
    };

    // Award points if applicable
    if (reward_type === "bonus_points" && points_amount) {
      await supabase.rpc("modify_user_points", {
        p_user_id: milestone.user_id,
        p_amount: points_amount,
        p_type: "earn",
        p_reference_type: "loyalty_milestone",
        p_reference_id: milestone.id,
        p_venue_id: milestone.venue_id,
        p_description: `Lojalitás jutalom: ${milestone.milestone_type}`,
      });
    }

    // Get user and venue names for notification
    const { data: userData } = await supabase.from("profiles").select("name").eq("id", milestone.user_id).single();
    const { data: venueData } = await supabase.from("venues").select("name").eq("id", milestone.venue_id).single();

    // Create notification log
    const notificationTitle = "🎉 Lojalitás jutalom!";
    const notificationBody =
      message ||
      `Köszönjük a hűségedet a ${venueData?.name || "helyszínen"}! Jutalmad: ${rewardLabels[reward_type]}`;

    await supabase.from("notification_logs").insert({
      user_id: milestone.user_id,
      title: notificationTitle,
      body: notificationBody,
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: {
        milestone_id: milestone.id,
        milestone_type: milestone.milestone_type,
        reward_type,
        venue_id: milestone.venue_id,
      },
    });

    // Update milestone as rewarded
    await supabase
      .from("loyalty_milestones")
      .update({
        reward_sent: true,
        reward_type,
        reward_sent_at: new Date().toISOString(),
        reward_message: message,
        admin_notified: true,
      })
      .eq("id", milestone_id);

    return new Response(
      JSON.stringify({
        success: true,
        action: "reward_sent",
        reward: {
          type: reward_type,
          label: rewardLabels[reward_type],
          user_name: userData?.name,
          venue_name: venueData?.name,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
