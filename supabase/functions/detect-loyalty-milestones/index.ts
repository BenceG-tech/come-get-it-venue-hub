import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MilestoneDefinition {
  type: string;
  label: string;
  condition: (stats: VisitStats) => boolean;
  suggested_reward: string;
  notify_admin: boolean;
}

interface VisitStats {
  visits_today: number;
  visits_this_week: number;
  visits_this_month: number;
  visits_total: number;
  total_spend: number;
}

const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    type: "first_visit",
    label: "Első Látogató",
    condition: (s) => s.visits_total === 1,
    suggested_reward: "welcome_drink",
    notify_admin: false,
  },
  {
    type: "returning",
    label: "Visszatérő",
    condition: (s) => s.visits_total === 3,
    suggested_reward: "10_percent_discount",
    notify_admin: false,
  },
  {
    type: "weekly_regular",
    label: "Heti Törzsvendég",
    condition: (s) => s.visits_this_week >= 3,
    suggested_reward: "bonus_points",
    notify_admin: true,
  },
  {
    type: "monthly_vip",
    label: "Havi VIP",
    condition: (s) => s.visits_this_month >= 10,
    suggested_reward: "free_dessert",
    notify_admin: true,
  },
  {
    type: "platinum",
    label: "Platina Tag",
    condition: (s) => s.visits_total === 50,
    suggested_reward: "vip_card",
    notify_admin: true,
  },
  {
    type: "legendary",
    label: "Legendás",
    condition: (s) => s.visits_total === 100,
    suggested_reward: "exclusive_offers",
    notify_admin: true,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request - can be triggered after a redemption or as a cron job
    let userId: string | null = null;
    let venueId: string | null = null;

    if (req.method === "POST") {
      const body = await req.json();
      userId = body.user_id;
      venueId = body.venue_id;
    }

    // Calculate date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Query for specific user/venue or all recent activity
    let redemptionsQuery = supabase
      .from("redemptions")
      .select("user_id, venue_id, redeemed_at, value, venues(name)")
      .eq("status", "success");

    if (userId && venueId) {
      redemptionsQuery = redemptionsQuery.eq("user_id", userId).eq("venue_id", venueId);
    } else {
      // Get redemptions from today for batch processing
      redemptionsQuery = redemptionsQuery.gte("redeemed_at", todayStart.toISOString());
    }

    const { data: redemptions, error: redemptionsError } = await redemptionsQuery;
    if (redemptionsError) throw redemptionsError;

    // Group by user-venue pairs
    const userVenuePairs = new Map<string, { user_id: string; venue_id: string; venue_name: string }>();
    for (const r of redemptions || []) {
      const key = `${r.user_id}-${r.venue_id}`;
      if (!userVenuePairs.has(key)) {
        userVenuePairs.set(key, {
          user_id: r.user_id,
          venue_id: r.venue_id,
          venue_name: (r.venues as any)?.name || "Ismeretlen",
        });
      }
    }

    const newMilestones: any[] = [];

    // Check each user-venue pair for milestones
    for (const [_, pair] of userVenuePairs) {
      // Get visit stats for this user-venue pair
      const { data: allRedemptions } = await supabase
        .from("redemptions")
        .select("redeemed_at, value")
        .eq("user_id", pair.user_id)
        .eq("venue_id", pair.venue_id)
        .eq("status", "success");

      const stats: VisitStats = {
        visits_today: 0,
        visits_this_week: 0,
        visits_this_month: 0,
        visits_total: 0,
        total_spend: 0,
      };

      for (const r of allRedemptions || []) {
        const redeemedAt = new Date(r.redeemed_at);
        stats.visits_total += 1;
        stats.total_spend += r.value || 0;

        if (redeemedAt >= todayStart) stats.visits_today += 1;
        if (redeemedAt >= weekStart) stats.visits_this_week += 1;
        if (redeemedAt >= monthStart) stats.visits_this_month += 1;
      }

      // Get POS spend
      const { data: posData } = await supabase
        .from("pos_transactions")
        .select("total_amount")
        .eq("user_id", pair.user_id)
        .eq("venue_id", pair.venue_id);

      const posSpend = (posData || []).reduce((sum, tx) => sum + (tx.total_amount || 0), 0);
      stats.total_spend += posSpend;

      // Get existing milestones for this user-venue pair
      const { data: existingMilestones } = await supabase
        .from("loyalty_milestones")
        .select("milestone_type")
        .eq("user_id", pair.user_id)
        .eq("venue_id", pair.venue_id);

      const existingTypes = new Set((existingMilestones || []).map((m) => m.milestone_type));

      // Check each milestone definition
      for (const milestone of MILESTONE_DEFINITIONS) {
        // Skip if already achieved
        if (existingTypes.has(milestone.type)) continue;

        // Check if condition is met
        if (milestone.condition(stats)) {
          newMilestones.push({
            user_id: pair.user_id,
            venue_id: pair.venue_id,
            milestone_type: milestone.type,
            visit_count: stats.visits_total,
            total_spend: stats.total_spend,
            admin_notified: !milestone.notify_admin, // If notify_admin is true, set to false (pending)
            admin_dismissed: false,
            reward_sent: false,
          });
        }
      }
    }

    // Insert new milestones
    if (newMilestones.length > 0) {
      const { error: insertError } = await supabase.from("loyalty_milestones").insert(newMilestones);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_milestones: newMilestones.length,
        milestones: newMilestones,
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
