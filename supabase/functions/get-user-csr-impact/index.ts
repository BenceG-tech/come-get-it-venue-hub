import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecentDonation {
  date: string;
  amount: number;
  impact_description: string;
  charity_name: string;
  venue_name: string;
}

interface CSRImpactResponse {
  stats: {
    total_donations_huf: number;
    total_impact_units: number;
    total_redemptions: number;
    current_streak_days: number;
    longest_streak_days: number;
    last_donation_date: string | null;
    global_rank: number | null;
    city_rank: number | null;
  };
  recent_donations: RecentDonation[];
  next_milestone: {
    target_units: number;
    current_units: number;
    remaining_units: number;
    description: string;
  } | null;
  leaderboard_position: {
    rank: number | null;
    total_users: number;
    percentile: number | null;
  };
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

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth context
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for data queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user CSR stats
    const { data: stats, error: statsError } = await supabase
      .from("user_csr_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If no stats exist, return zeros
    const userStats = stats || {
      total_donations_huf: 0,
      total_impact_units: 0,
      total_redemptions_with_charity: 0,
      current_streak_days: 0,
      longest_streak_days: 0,
      last_donation_date: null,
      global_rank: null,
      city_rank: null,
    };

    // Get recent donations (last 10)
    const { data: recentDonations } = await supabase
      .from("charity_donations")
      .select(`
        created_at,
        total_donation_huf,
        impact_description,
        charity_name,
        venue:venues(name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const formattedDonations: RecentDonation[] = (recentDonations || []).map((d: any) => ({
      date: d.created_at.split('T')[0],
      amount: d.total_donation_huf,
      impact_description: d.impact_description,
      charity_name: d.charity_name,
      venue_name: d.venue?.name || "Unknown Venue",
    }));

    // Calculate next milestone (every 10 impact units)
    const currentUnits = userStats.total_impact_units;
    const nextMilestone = Math.ceil((currentUnits + 1) / 10) * 10;
    const remainingUnits = nextMilestone - currentUnits;

    // Milestone descriptions
    const getMilestoneDescription = (units: number): string => {
      if (units <= 10) return "Első tíz adag! 🎉";
      if (units <= 25) return "Negyed század! 🌟";
      if (units <= 50) return "Félszáz! Hős vagy! 💪";
      if (units <= 100) return "SZÁZ! Legendás! 👑";
      if (units <= 250) return "250! Csodálatos! ⭐";
      if (units <= 500) return "500! Fenomenális! 🚀";
      if (units <= 1000) return "EZER! Hihetetlen! 💎";
      return `${units} adag! Egy igazi hős! 🏆`;
    };

    const milestone = currentUnits > 0 ? {
      target_units: nextMilestone,
      current_units: currentUnits,
      remaining_units: remainingUnits,
      description: getMilestoneDescription(nextMilestone),
    } : null;

    // Get leaderboard stats
    const { count: totalUsers } = await supabase
      .from("user_csr_stats")
      .select("*", { count: "exact", head: true })
      .gt("total_impact_units", 0);

    const percentile = userStats.global_rank && totalUsers
      ? Math.round((1 - (userStats.global_rank / totalUsers)) * 100)
      : null;

    const response: CSRImpactResponse = {
      stats: {
        total_donations_huf: userStats.total_donations_huf,
        total_impact_units: userStats.total_impact_units,
        total_redemptions: userStats.total_redemptions_with_charity,
        current_streak_days: userStats.current_streak_days,
        longest_streak_days: userStats.longest_streak_days,
        last_donation_date: userStats.last_donation_date,
        global_rank: userStats.global_rank,
        city_rank: userStats.city_rank,
      },
      recent_donations: formattedDonations,
      next_milestone: milestone,
      leaderboard_position: {
        rank: userStats.global_rank,
        total_users: totalUsers || 0,
        percentile,
      },
    };

    return new Response(
      JSON.stringify(response),
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
