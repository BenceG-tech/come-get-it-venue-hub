import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VenueAffinity {
  venue_id: string;
  venue_name: string;
  visit_count: number;
  first_visit: string | null;
  last_visit: string | null;
  preferred_days: number[];
  preferred_hours: number[];
}

interface DrinkPreference {
  drink_name: string;
  category: string | null;
  count: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parallel data fetching
    const [
      profileResult,
      pointsResult,
      activityLogsResult,
      redemptionsResult,
      rewardRedemptionsResult,
      notificationLogsResult,
      pointsTransactionsResult
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_points").select("*").eq("user_id", userId).single(),
      supabase.from("user_activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("redemptions").select(`*, venues:venue_id (name), venue_drinks:drink_id (category)`).eq("user_id", userId).order("redeemed_at", { ascending: false }),
      supabase.from("reward_redemptions").select(`*, rewards:reward_id (name, points_required), venues:venue_id (name)`).eq("user_id", userId).order("redeemed_at", { ascending: false }),
      supabase.from("notification_logs").select("*").eq("user_id", userId).order("sent_at", { ascending: false }).limit(20),
      supabase.from("points_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50)
    ]);

    const profile = profileResult.data;
    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const points = pointsResult.data;
    const activityLogs = activityLogsResult.data || [];
    const redemptions = redemptionsResult.data || [];
    const rewardRedemptions = rewardRedemptionsResult.data || [];
    const notificationLogs = notificationLogsResult.data || [];
    const pointsTransactions = pointsTransactionsResult.data || [];

    // Calculate session stats
    const appOpenEvents = activityLogs.filter(l => l.event_type === "app_open");
    const appCloseEvents = activityLogs.filter(l => l.event_type === "app_close");
    const sessionsWithDuration = appCloseEvents.filter(e => e.metadata?.session_duration_seconds);
    const avgSessionDuration = sessionsWithDuration.length > 0
      ? Math.round(sessionsWithDuration.reduce((sum, e) => sum + (e.metadata.session_duration_seconds as number), 0) / sessionsWithDuration.length)
      : 0;

    // Active days calculation
    const activeDaysSet = new Set(activityLogs.map(l => l.created_at.split('T')[0]));
    const uniqueActiveDays = activeDaysSet.size;

    // Days since registration
    const registrationDate = new Date(profile.created_at);
    const daysSinceRegistration = Math.floor((Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));

    // Venue affinity with detailed info
    const venueData: Record<string, VenueAffinity> = {};
    redemptions.forEach(r => {
      const venueId = r.venue_id;
      const venueName = r.venues?.name || "Unknown";
      const redeemedAt = new Date(r.redeemed_at);
      
      if (!venueData[venueId]) {
        venueData[venueId] = {
          venue_id: venueId,
          venue_name: venueName,
          visit_count: 0,
          first_visit: r.redeemed_at,
          last_visit: r.redeemed_at,
          preferred_days: [],
          preferred_hours: []
        };
      }
      
      venueData[venueId].visit_count++;
      if (r.redeemed_at < venueData[venueId].first_visit!) {
        venueData[venueId].first_visit = r.redeemed_at;
      }
      if (r.redeemed_at > venueData[venueId].last_visit!) {
        venueData[venueId].last_visit = r.redeemed_at;
      }
      venueData[venueId].preferred_days.push(redeemedAt.getDay());
      venueData[venueId].preferred_hours.push(redeemedAt.getHours());
    });

    // Calculate mode for preferred days/hours
    Object.values(venueData).forEach(v => {
      v.preferred_days = getModes(v.preferred_days);
      v.preferred_hours = getModes(v.preferred_hours);
    });

    const venueAffinity = Object.values(venueData)
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, 10);

    // Drink preferences with categories
    const drinkData: Record<string, DrinkPreference> = {};
    redemptions.forEach(r => {
      const drinkName = r.drink;
      const category = r.venue_drinks?.category || null;
      if (!drinkData[drinkName]) {
        drinkData[drinkName] = { drink_name: drinkName, category, count: 0 };
      }
      drinkData[drinkName].count++;
    });

    const drinkPreferences = Object.values(drinkData)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Engagement Score (0-100)
    // Based on: recent activity, redemptions, session frequency, return rate
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    const recentSessions = appOpenEvents.filter(e => new Date(e.created_at).getTime() > sevenDaysAgo).length;
    const recentRedemptions = redemptions.filter(r => new Date(r.redeemed_at).getTime() > thirtyDaysAgo).length;
    const totalRedemptions = redemptions.length;
    
    // Score components (each 0-25)
    const sessionScore = Math.min(25, recentSessions * 5); // 5 sessions = max
    const redemptionScore = Math.min(25, recentRedemptions * 3); // 8 redemptions = max
    const loyaltyScore = Math.min(25, totalRedemptions * 2); // 12+ total = max
    const recencyScore = profile.last_seen_at 
      ? Math.max(0, 25 - Math.floor((now - new Date(profile.last_seen_at).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;
    
    const engagementScore = Math.round(sessionScore + redemptionScore + loyaltyScore + recencyScore);

    // Churn Risk: low / medium / high
    const daysSinceLastActivity = profile.last_seen_at
      ? Math.floor((now - new Date(profile.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    let churnRisk: "low" | "medium" | "high" = "low";
    if (daysSinceLastActivity === null || daysSinceLastActivity > 30) {
      churnRisk = "high";
    } else if (daysSinceLastActivity > 14) {
      churnRisk = "medium";
    }

    // LTV (Lifetime Value) - simple calculation
    const totalSpend = points?.total_spend || 0;
    const ltv = totalSpend + (totalRedemptions * 1500); // Assume avg drink value 1500 Ft

    // Preference Profile tags
    const preferenceProfile: string[] = [];
    if (drinkPreferences.length > 0) {
      const topCategory = drinkPreferences[0].category;
      if (topCategory === "beer") preferenceProfile.push("Sörimádó");
      else if (topCategory === "wine") preferenceProfile.push("Boros ízlés");
      else if (topCategory === "cocktail") preferenceProfile.push("Koktél kedvelő");
      else if (topCategory === "spirit") preferenceProfile.push("Rövidital rajongó");
      else if (topCategory === "soft") preferenceProfile.push("Alkoholmentes");
    }
    
    if (venueAffinity.length >= 3) preferenceProfile.push("Felfedező");
    if (totalRedemptions > 20) preferenceProfile.push("Power User");
    if (engagementScore > 75) preferenceProfile.push("Aktív tag");
    if (churnRisk === "high") preferenceProfile.push("Visszahozandó");

    // Weekly trend data (last 4 weeks)
    const weeklyTrends: { week: string; sessions: number; redemptions: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
      const weekLabel = `W-${i}`;
      
      const weekSessions = appOpenEvents.filter(e => {
        const t = new Date(e.created_at).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length;
      
      const weekRedemptions = redemptions.filter(r => {
        const t = new Date(r.redeemed_at).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length;
      
      weeklyTrends.push({ week: weekLabel, sessions: weekSessions, redemptions: weekRedemptions });
    }
    weeklyTrends.reverse();

    // Hourly activity heatmap (7 days x 24 hours)
    const hourlyHeatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    activityLogs.forEach(log => {
      const date = new Date(log.created_at);
      const day = date.getDay();
      const hour = date.getHours();
      hourlyHeatmap[day][hour]++;
    });

    // Points flow data
    const pointsEarned = pointsTransactions.filter(t => t.amount > 0);
    const pointsSpent = pointsTransactions.filter(t => t.amount < 0);
    
    const earningsByType: Record<string, number> = {};
    pointsEarned.forEach(t => {
      const type = t.type || "other";
      earningsByType[type] = (earningsByType[type] || 0) + t.amount;
    });

    const spendingByType: Record<string, number> = {};
    pointsSpent.forEach(t => {
      const type = t.type || "other";
      spendingByType[type] = (spendingByType[type] || 0) + Math.abs(t.amount);
    });

    // Build response
    const response = {
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        last_seen_at: profile.last_seen_at,
        signup_source: profile.signup_source,
        device_info: profile.device_info
      },
      points: points ? {
        balance: points.balance,
        lifetime_earned: points.lifetime_earned,
        lifetime_spent: points.lifetime_spent,
        total_spend: points.total_spend
      } : {
        balance: 0,
        lifetime_earned: 0,
        lifetime_spent: 0,
        total_spend: 0
      },
      scores: {
        engagement_score: engagementScore,
        churn_risk: churnRisk,
        ltv: ltv,
        preference_profile: preferenceProfile
      },
      stats: {
        total_sessions: appOpenEvents.length,
        avg_session_duration_seconds: avgSessionDuration,
        unique_active_days: uniqueActiveDays,
        days_since_registration: daysSinceRegistration,
        total_free_drink_redemptions: redemptions.length,
        total_reward_redemptions: rewardRedemptions.length,
        favorite_venue: venueAffinity[0] || null,
        favorite_drink: drinkPreferences[0] || null,
        days_since_last_activity: daysSinceLastActivity,
        app_opens_last_7_days: recentSessions,
        redemptions_last_30_days: recentRedemptions
      },
      weekly_trends: weeklyTrends,
      hourly_heatmap: hourlyHeatmap,
      drink_preferences: drinkPreferences,
      venue_affinity: venueAffinity,
      points_flow: {
        earnings_by_type: earningsByType,
        spending_by_type: spendingByType,
        recent_transactions: pointsTransactions.slice(0, 10).map(t => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          description: t.description,
          created_at: t.created_at
        }))
      },
      recent_activity: activityLogs.slice(0, 30).map(log => ({
        event_type: log.event_type,
        venue_id: log.venue_id,
        metadata: log.metadata,
        device_info: log.device_info,
        app_version: log.app_version,
        created_at: log.created_at
      })),
      free_drink_redemptions: redemptions.map(r => ({
        id: r.id,
        venue_name: r.venues?.name || "Unknown",
        venue_id: r.venue_id,
        drink: r.drink,
        value: r.value,
        redeemed_at: r.redeemed_at
      })),
      reward_redemptions: rewardRedemptions.map(r => ({
        id: r.id,
        venue_name: r.venues?.name || "Unknown",
        venue_id: r.venue_id,
        reward_name: r.rewards?.name || "Unknown",
        points_spent: r.rewards?.points_required || 0,
        redeemed_at: r.redeemed_at
      })),
      notification_history: notificationLogs.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        status: n.status,
        sent_at: n.sent_at,
        opened_at: n.opened_at
      }))
    };

    console.log(`Extended user stats fetched for ${userId}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching extended user stats:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Get mode(s) from array
function getModes(arr: number[]): number[] {
  if (arr.length === 0) return [];
  
  const counts: Record<number, number> = {};
  arr.forEach(v => counts[v] = (counts[v] || 0) + 1);
  
  const maxCount = Math.max(...Object.values(counts));
  return Object.entries(counts)
    .filter(([, count]) => count === maxCount)
    .map(([val]) => parseInt(val))
    .slice(0, 3);
}