import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    console.log(`Fetching analytics for last ${days} days from ${startDateStr}`);

    // 1. Daily Active Users (from user_activity_logs)
    const { data: dauData, error: dauError } = await supabase
      .from("user_activity_logs")
      .select("user_id, created_at")
      .gte("created_at", startDateStr);

    if (dauError) {
      console.error("DAU query error:", dauError);
    }

    // Group by date for DAU
    const dauByDate = new Map<string, Set<string>>();
    (dauData || []).forEach((log) => {
      const date = log.created_at?.split("T")[0];
      if (date) {
        if (!dauByDate.has(date)) dauByDate.set(date, new Set());
        dauByDate.get(date)!.add(log.user_id);
      }
    });

    const daily_active_users = Array.from(dauByDate.entries())
      .map(([date, users]) => ({ date, count: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. Weekly Active Users
    const wauByWeek = new Map<string, Set<string>>();
    (dauData || []).forEach((log) => {
      const date = new Date(log.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
      const weekKey = weekStart.toISOString().split("T")[0];
      
      if (!wauByWeek.has(weekKey)) wauByWeek.set(weekKey, new Set());
      wauByWeek.get(weekKey)!.add(log.user_id);
    });

    const weekly_active_users = Array.from(wauByWeek.entries())
      .map(([week_start, users]) => ({ week_start, count: users.size }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));

    // 3. Redemption Trends
    const { data: redemptionData, error: redemptionError } = await supabase
      .from("redemptions")
      .select("user_id, redeemed_at, venue_id")
      .gte("redeemed_at", startDateStr);

    if (redemptionError) {
      console.error("Redemption query error:", redemptionError);
    }

    const redemptionsByDate = new Map<string, { count: number; users: Set<string> }>();
    (redemptionData || []).forEach((r) => {
      const date = r.redeemed_at?.split("T")[0];
      if (date) {
        if (!redemptionsByDate.has(date)) {
          redemptionsByDate.set(date, { count: 0, users: new Set() });
        }
        const entry = redemptionsByDate.get(date)!;
        entry.count++;
        entry.users.add(r.user_id);
      }
    });

    const redemption_trends = Array.from(redemptionsByDate.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        unique_users: data.users.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Top Venues by Redemptions
    const venueRedemptions = new Map<string, { count: number; users: Set<string> }>();
    (redemptionData || []).forEach((r) => {
      if (r.venue_id) {
        if (!venueRedemptions.has(r.venue_id)) {
          venueRedemptions.set(r.venue_id, { count: 0, users: new Set() });
        }
        const entry = venueRedemptions.get(r.venue_id)!;
        entry.count++;
        entry.users.add(r.user_id);
      }
    });

    // Get venue names
    const venueIds = Array.from(venueRedemptions.keys());
    const { data: venuesData } = await supabase
      .from("venues")
      .select("id, name")
      .in("id", venueIds.length > 0 ? venueIds : ["__none__"]);

    const venueNames = new Map((venuesData || []).map((v) => [v.id, v.name]));

    const top_venues = Array.from(venueRedemptions.entries())
      .map(([venue_id, data]) => ({
        venue_id,
        venue_name: venueNames.get(venue_id) || "Ismeretlen helyszín",
        redemption_count: data.count,
        unique_users: data.users.size,
      }))
      .sort((a, b) => b.redemption_count - a.redemption_count)
      .slice(0, 5);

    // 5. Hourly Activity Heatmap (7 days x 24 hours)
    const hourlyActivity: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );

    (dauData || []).forEach((log) => {
      if (log.created_at) {
        const date = new Date(log.created_at);
        const dayOfWeek = (date.getDay() + 6) % 7; // Monday = 0
        const hour = date.getHours();
        hourlyActivity[dayOfWeek][hour]++;
      }
    });

    // 6. User Retention Cohorts (simplified - by signup week)
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", startDateStr);

    // Group users by signup week
    const cohorts = new Map<string, Set<string>>();
    (profilesData || []).forEach((p) => {
      const date = new Date(p.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekKey = weekStart.toISOString().split("T")[0];
      
      if (!cohorts.has(weekKey)) cohorts.set(weekKey, new Set());
      cohorts.get(weekKey)!.add(p.id);
    });

    // Calculate retention for each cohort
    const retention_cohorts = Array.from(cohorts.entries())
      .slice(-4) // Last 4 weeks
      .map(([cohort_week, users]) => {
        const userIds = Array.from(users);
        const cohortStart = new Date(cohort_week);
        
        // Calculate activity for each subsequent week
        const weekRetention: Record<string, number> = { week_0: 100 };
        
        for (let w = 1; w <= 4; w++) {
          const weekStart = new Date(cohortStart);
          weekStart.setDate(weekStart.getDate() + w * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          
          if (weekStart > now) break;
          
          const activeInWeek = (dauData || []).filter((log) => {
            if (!userIds.includes(log.user_id)) return false;
            const logDate = new Date(log.created_at);
            return logDate >= weekStart && logDate < weekEnd;
          });
          
          const uniqueActive = new Set(activeInWeek.map((l) => l.user_id)).size;
          weekRetention[`week_${w}`] = userIds.length > 0 
            ? Math.round((uniqueActive / userIds.length) * 100) 
            : 0;
        }
        
        return { cohort_week, cohort_size: userIds.length, ...weekRetention };
      });

    // 7. Summary Stats
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const today = now.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeToday = dauByDate.get(today)?.size || 0;
    
    const active7Days = new Set(
      (dauData || [])
        .filter((l) => new Date(l.created_at) >= sevenDaysAgo)
        .map((l) => l.user_id)
    ).size;
    
    const active30Days = new Set(
      (dauData || [])
        .filter((l) => new Date(l.created_at) >= thirtyDaysAgo)
        .map((l) => l.user_id)
    ).size;

    const totalRedemptions = (redemptionData || []).length;
    const uniqueRedeemers = new Set((redemptionData || []).map((r) => r.user_id)).size;

    const summary = {
      total_users: totalUsers || 0,
      active_today: activeToday,
      active_7_days: active7Days,
      active_30_days: active30Days,
      total_redemptions: totalRedemptions,
      avg_sessions_per_user: active30Days > 0 
        ? Math.round((dauData?.length || 0) / active30Days * 10) / 10 
        : 0,
      avg_redemptions_per_user: uniqueRedeemers > 0 
        ? Math.round(totalRedemptions / uniqueRedeemers * 10) / 10 
        : 0,
    };

    console.log("Analytics computed successfully", {
      dau_count: daily_active_users.length,
      wau_count: weekly_active_users.length,
      redemption_days: redemption_trends.length,
      top_venues_count: top_venues.length,
    });

    return new Response(
      JSON.stringify({
        daily_active_users,
        weekly_active_users,
        retention_cohorts,
        redemption_trends,
        top_venues,
        hourly_activity: hourlyActivity,
        summary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
