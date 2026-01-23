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
  today_redemption: {
    redeemed: boolean;
    redeemed_at?: string;
    drink_name?: string;
  } | null;
  next_window: { start: string; end: string } | null;
}

interface DrinkPreference {
  drink_name: string;
  category: string | null;
  count: number;
}

interface PlatformAverages {
  avg_redemptions_per_month: number;
  avg_spend_per_redemption: number;
  avg_venues_visited: number;
  avg_roi: number;
}

const dayNames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

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

    // Get today's date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Parallel data fetching - including today's redemptions and free drink windows
    const [
      profileResult,
      pointsResult,
      activityLogsResult,
      redemptionsResult,
      rewardRedemptionsResult,
      notificationLogsResult,
      pointsTransactionsResult,
      todayRedemptionsResult,
      freeDrinkWindowsResult,
      platformStatsResult
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_points").select("*").eq("user_id", userId).single(),
      supabase.from("user_activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("redemptions").select(`*, venues:venue_id (name), venue_drinks:drink_id (category)`).eq("user_id", userId).order("redeemed_at", { ascending: false }),
      supabase.from("reward_redemptions").select(`*, rewards:reward_id (name, points_required), venues:venue_id (name)`).eq("user_id", userId).order("redeemed_at", { ascending: false }),
      supabase.from("notification_logs").select("*").eq("user_id", userId).order("sent_at", { ascending: false }).limit(20),
      supabase.from("points_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      // Today's redemptions for this user
      supabase.from("redemptions")
        .select("venue_id, drink, redeemed_at")
        .eq("user_id", userId)
        .gte("redeemed_at", todayStart.toISOString())
        .lt("redeemed_at", todayEnd.toISOString()),
      // All free drink windows
      supabase.from("free_drink_windows").select("venue_id, days, start_time, end_time"),
      // Platform-wide stats for comparison
      supabase.from("user_points").select("total_spend, lifetime_earned")
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
    const todayRedemptions = todayRedemptionsResult.data || [];
    const freeDrinkWindows = freeDrinkWindowsResult.data || [];
    const allUserPoints = platformStatsResult.data || [];

    // Calculate platform averages
    const platformAverages: PlatformAverages = calculatePlatformAverages(allUserPoints, redemptions.length);

    // Build today's redemption lookup by venue
    const todayRedemptionByVenue: Record<string, { redeemed: boolean; redeemed_at?: string; drink_name?: string }> = {};
    todayRedemptions.forEach(r => {
      todayRedemptionByVenue[r.venue_id] = {
        redeemed: true,
        redeemed_at: r.redeemed_at,
        drink_name: r.drink
      };
    });

    // Build next window lookup by venue
    const currentDay = now.getDay(); // 0 = Sunday
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const nextWindowByVenue: Record<string, { start: string; end: string } | null> = {};
    freeDrinkWindows.forEach(w => {
      // Check if window is active today
      if (w.days.includes(currentDay)) {
        const startTime = w.start_time.slice(0, 5);
        const endTime = w.end_time.slice(0, 5);
        
        // Only show if window is in the future or currently active
        if (endTime > currentTime) {
          if (!nextWindowByVenue[w.venue_id] || startTime < nextWindowByVenue[w.venue_id]!.start) {
            nextWindowByVenue[w.venue_id] = { start: startTime, end: endTime };
          }
        }
      }
    });

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

    // Venue affinity with detailed info including today status
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
          preferred_hours: [],
          today_redemption: todayRedemptionByVenue[venueId] || { redeemed: false },
          next_window: nextWindowByVenue[venueId] || null
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
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    const recentSessions = appOpenEvents.filter(e => new Date(e.created_at).getTime() > sevenDaysAgo).length;
    const recentRedemptions = redemptions.filter(r => new Date(r.redeemed_at).getTime() > thirtyDaysAgo).length;
    const totalRedemptions = redemptions.length;
    
    // Score components (each 0-25)
    const sessionScore = Math.min(25, recentSessions * 5);
    const redemptionScore = Math.min(25, recentRedemptions * 3);
    const loyaltyScore = Math.min(25, totalRedemptions * 2);
    const recencyScore = profile.last_seen_at 
      ? Math.max(0, 25 - Math.floor((Date.now() - new Date(profile.last_seen_at).getTime()) / (24 * 60 * 60 * 1000)))
      : 0;
    
    const engagementScore = Math.round(sessionScore + redemptionScore + loyaltyScore + recencyScore);

    // Churn Risk with detailed factors
    const daysSinceLastActivity = profile.last_seen_at
      ? Math.floor((Date.now() - new Date(profile.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    let churnRisk: "low" | "medium" | "high" = "low";
    const churnFactors: string[] = [];
    
    if (daysSinceLastActivity === null || daysSinceLastActivity > 30) {
      churnRisk = "high";
      churnFactors.push(`${daysSinceLastActivity || 30}+ napja nem volt beváltás`);
    } else if (daysSinceLastActivity > 14) {
      churnRisk = "medium";
      churnFactors.push(`${daysSinceLastActivity} napja nem volt aktivitás`);
    }
    
    // Check for decreasing activity
    const thisWeekSessions = appOpenEvents.filter(e => new Date(e.created_at).getTime() > sevenDaysAgo).length;
    const lastWeekSessions = appOpenEvents.filter(e => {
      const t = new Date(e.created_at).getTime();
      return t > sevenDaysAgo - 7 * 24 * 60 * 60 * 1000 && t <= sevenDaysAgo;
    }).length;
    
    if (lastWeekSessions > 0 && thisWeekSessions < lastWeekSessions * 0.5) {
      if (churnRisk === "low") churnRisk = "medium";
      const decrease = Math.round((1 - thisWeekSessions / lastWeekSessions) * 100);
      churnFactors.push(`App megnyitások ${decrease}%-kal csökkentek`);
    }
    
    // Check notification engagement
    const recentNotifications = notificationLogs.slice(0, 5);
    const openedNotifications = recentNotifications.filter(n => n.opened_at).length;
    if (recentNotifications.length >= 3 && openedNotifications === 0) {
      churnFactors.push(`Push értesítéseket nem nyitja meg (utolsó ${recentNotifications.length}-ból 0)`);
    }

    // LTV (Lifetime Value)
    const totalSpend = points?.total_spend || 0;
    const ltv = totalSpend + (totalRedemptions * 1500);

    // ROI calculation
    const freeDrinkValue = totalRedemptions * 1500;
    const roi = freeDrinkValue > 0 ? totalSpend / freeDrinkValue : 0;

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
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
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

    // --- Predictions Calculation ---
    // 1. Expected redemptions (30 days)
    const avgRedemptionsPerMonth = recentRedemptions;
    const expectedRedemptions = {
      min: Math.max(0, avgRedemptionsPerMonth - 3),
      max: avgRedemptionsPerMonth + 3,
      average: avgRedemptionsPerMonth
    };

    // 2. Estimated spend
    const spendPerRedemption = totalRedemptions > 0 ? (totalSpend / totalRedemptions) : 0;
    const estimatedSpend = {
      min: Math.round(expectedRedemptions.min * spendPerRedemption),
      max: Math.round(expectedRedemptions.max * spendPerRedemption)
    };

    // 3. Likely venues (from venue_affinity)
    const totalVisits = venueAffinity.reduce((s, v) => s + v.visit_count, 0);
    const likelyVenues = venueAffinity.slice(0, 3).map(v => ({
      venue_id: v.venue_id,
      venue_name: v.venue_name,
      probability: totalVisits > 0 ? Math.round((v.visit_count / totalVisits) * 100) : 0
    }));

    // 4. Likely day & hour from hourly_heatmap
    let maxDayValue = 0;
    let likelyDay = 0;
    let maxHourValue = 0;
    let likelyHour = 0;
    
    for (let day = 0; day < 7; day++) {
      const dayTotal = hourlyHeatmap[day].reduce((s, v) => s + v, 0);
      if (dayTotal > maxDayValue) {
        maxDayValue = dayTotal;
        likelyDay = day;
      }
      for (let hour = 0; hour < 24; hour++) {
        if (hourlyHeatmap[day][hour] > maxHourValue) {
          maxHourValue = hourlyHeatmap[day][hour];
          likelyHour = hour;
        }
      }
    }

    const totalActivityEvents = hourlyHeatmap.flat().reduce((s, v) => s + v, 0);
    const likelyDayProbability = totalActivityEvents > 0 ? Math.round((maxDayValue / totalActivityEvents) * 100) : 0;
    const likelyHourProbability = totalActivityEvents > 0 ? Math.round((maxHourValue / totalActivityEvents) * 100) : 0;

    // 5. Optimal push time (day before likely day, afternoon)
    const optimalPushDay = (likelyDay - 1 + 7) % 7;
    const optimalPush = likelyVenues.length > 0 && totalActivityEvents > 5 ? {
      day_name: dayNames[optimalPushDay],
      time: "14:30",
      suggested_message: `Emlékeztető: holnap ${likelyVenues[0].venue_name} ingyen itallal vár!`
    } : null;

    // 6. Confidence based on data weeks
    const dataWeeks = Math.floor(daysSinceRegistration / 7);
    let confidence: "low" | "medium" | "high" = "low";
    if (dataWeeks >= 4 && totalRedemptions >= 8) {
      confidence = "high";
    } else if (dataWeeks >= 2 && totalRedemptions >= 3) {
      confidence = "medium";
    }

    const predictions = {
      expected_redemptions_30_days: expectedRedemptions,
      estimated_spend_30_days: estimatedSpend,
      likely_venues: likelyVenues,
      likely_day: {
        day: likelyDay,
        day_name: dayNames[likelyDay],
        probability: likelyDayProbability
      },
      likely_hour: {
        hour: likelyHour,
        probability: likelyHourProbability
      },
      optimal_push: optimalPush,
      confidence,
      data_weeks: dataWeeks
    };

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
        churn_factors: churnFactors,
        ltv: ltv,
        roi: roi,
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
      platform_comparison: {
        user_redemptions_per_month: recentRedemptions,
        user_spend_per_redemption: totalRedemptions > 0 ? Math.round(totalSpend / totalRedemptions) : 0,
        user_venues_visited: venueAffinity.length,
        user_roi: roi,
        platform_avg: platformAverages
      },
      predictions,
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

// Helper: Calculate platform averages
function calculatePlatformAverages(allUserPoints: any[], userRedemptionCount: number): PlatformAverages {
  const totalUsers = allUserPoints.length || 1;
  const totalSpend = allUserPoints.reduce((sum, u) => sum + (u.total_spend || 0), 0);
  const totalEarned = allUserPoints.reduce((sum, u) => sum + (u.lifetime_earned || 0), 0);
  
  // Rough estimates based on available data
  const avgRedemptionsPerMonth = 4.7; // Placeholder - would need redemptions table aggregate
  const avgSpendPerRedemption = totalUsers > 0 ? Math.round(totalSpend / (totalUsers * 5)) : 2190;
  const avgVenuesVisited = 2; // Placeholder
  const avgRoi = 3.0; // Placeholder
  
  return {
    avg_redemptions_per_month: avgRedemptionsPerMonth,
    avg_spend_per_redemption: avgSpendPerRedemption,
    avg_venues_visited: avgVenuesVisited,
    avg_roi: avgRoi
  };
}
