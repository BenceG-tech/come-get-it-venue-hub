import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MILESTONE_LABELS: Record<string, { label: string; emoji: string; suggested_reward: string }> = {
  first_visit: { label: "Első Látogató", emoji: "👋", suggested_reward: "Welcome drink" },
  returning: { label: "Visszatérő", emoji: "🔄", suggested_reward: "10% kedvezmény" },
  weekly_regular: { label: "Heti Törzsvendég", emoji: "🔥", suggested_reward: "50 bónusz pont" },
  monthly_vip: { label: "Havi VIP", emoji: "⭐", suggested_reward: "Ingyen desszert" },
  platinum: { label: "Platina Tag", emoji: "💎", suggested_reward: "VIP kártya" },
  legendary: { label: "Legendás", emoji: "👑", suggested_reward: "Exkluzív ajánlatok" },
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending milestones (not dismissed, not rewarded, admin should be notified)
    const { data: pendingMilestones, error } = await supabase
      .from("loyalty_milestones")
      .select(`
        id,
        user_id,
        venue_id,
        milestone_type,
        achieved_at,
        visit_count,
        total_spend,
        reward_sent,
        admin_dismissed
      `)
      .eq("admin_notified", false)
      .eq("admin_dismissed", false)
      .order("achieved_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Get user and venue names
    const userIds = [...new Set((pendingMilestones || []).map((m) => m.user_id))];
    const venueIds = [...new Set((pendingMilestones || []).map((m) => m.venue_id))];

    const { data: users } = await supabase.from("profiles").select("id, name").in("id", userIds);
    const { data: venues } = await supabase.from("venues").select("id, name").in("id", venueIds);

    const userMap = new Map((users || []).map((u) => [u.id, u.name]));
    const venueMap = new Map((venues || []).map((v) => [v.id, v.name]));

    // Enrich milestones
    const enrichedMilestones = (pendingMilestones || []).map((m) => {
      const milestoneInfo = MILESTONE_LABELS[m.milestone_type] || {
        label: m.milestone_type,
        emoji: "🏆",
        suggested_reward: "Bónusz pont",
      };

      return {
        ...m,
        user_name: userMap.get(m.user_id) || "Ismeretlen",
        venue_name: venueMap.get(m.venue_id) || "Ismeretlen",
        milestone_label: milestoneInfo.label,
        milestone_emoji: milestoneInfo.emoji,
        suggested_reward: milestoneInfo.suggested_reward,
      };
    });

    // Get summary counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from("loyalty_milestones")
      .select("id", { count: "exact", head: true })
      .gte("achieved_at", todayStart.toISOString());

    // Group by type for summary
    const typeCounts: Record<string, number> = {};
    for (const m of enrichedMilestones) {
      typeCounts[m.milestone_type] = (typeCounts[m.milestone_type] || 0) + 1;
    }

    return new Response(
      JSON.stringify({
        pending_milestones: enrichedMilestones,
        summary: {
          pending_count: enrichedMilestones.length,
          today_total: todayCount || 0,
          by_type: typeCounts,
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
