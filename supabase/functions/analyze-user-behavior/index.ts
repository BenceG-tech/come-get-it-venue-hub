import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Behavioral Pattern Definitions
const PATTERNS = {
  weekend_warrior: {
    id: "weekend_warrior",
    name: "Weekend Warrior",
    nameHu: "Hétvégi Harcos",
    icon: "🎉",
    description: "80%+ beváltás hétvégén",
    action: "Pénteki push 16:00-kor"
  },
  happy_hour_hunter: {
    id: "happy_hour_hunter", 
    name: "Happy Hour Hunter",
    nameHu: "Happy Hour Vadász",
    icon: "🍻",
    description: "70%+ beváltás 17-19h között",
    action: "Happy hour értesítések"
  },
  venue_hopper: {
    id: "venue_hopper",
    name: "Venue Hopper",
    nameHu: "Helyszín Felfedező",
    icon: "🗺️",
    description: "3+ különböző helyszín 30 napon belül",
    action: "Új helyszín ajánlatok"
  },
  loyal_regular: {
    id: "loyal_regular",
    name: "Loyal Regular",
    nameHu: "Hűséges Törzsvendég",
    icon: "👑",
    description: "80%+ egy helyszínre jár",
    action: "VIP jutalmak"
  },
  ghost_mode: {
    id: "ghost_mode",
    name: "Ghost Mode",
    nameHu: "Szellem Mód",
    icon: "👻",
    description: "App open de nincs beváltás",
    action: "Motivációs kampány"
  },
  social_butterfly: {
    id: "social_butterfly",
    name: "Social Butterfly",
    nameHu: "Társasági Pillangó",
    icon: "🦋",
    description: "Csoportos beváltási minta",
    action: "Group deal ajánlatok"
  },
  brand_loyal: {
    id: "brand_loyal",
    name: "Brand Loyal",
    nameHu: "Márka Hűséges",
    icon: "💎",
    description: "70%+ egy márka italát issza",
    action: "Márka partnerség"
  },
  night_owl: {
    id: "night_owl",
    name: "Night Owl",
    nameHu: "Éjjeli Bagoly",
    icon: "🦉",
    description: "60%+ beváltás 21:00 után",
    action: "Késő esti ajánlatok"
  },
  early_bird: {
    id: "early_bird",
    name: "Early Bird",
    nameHu: "Korai Madár",
    icon: "🐦",
    description: "Korai időszakban aktív (17:00 előtt)",
    action: "Korai happy hour"
  },
  power_user: {
    id: "power_user",
    name: "Power User",
    nameHu: "Power User",
    icon: "⚡",
    description: "20+ beváltás összesen",
    action: "VIP program ajánlat"
  }
};

interface BehaviorAnalysis {
  patterns: Array<{
    id: string;
    name: string;
    nameHu: string;
    icon: string;
    description: string;
    action: string;
    confidence: number;
    evidence: string;
  }>;
  cluster: {
    id: string;
    name: string;
    size: number;
  } | null;
  predictions: {
    next_venue: { venue_id: string; venue_name: string; probability: number } | null;
    next_day: { day: number; dayName: string; probability: number } | null;
    next_hour: { hour: number; probability: number } | null;
    estimated_next_visit_days: number | null;
    optimal_push_time: string | null;
  };
  micro_moments: Array<{
    type: string;
    title: string;
    description: string;
    urgency: "high" | "medium" | "low";
    action: string;
  }>;
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

    // Fetch user data
    const [
      profileResult,
      redemptionsResult,
      activityLogsResult,
      notificationsResult
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("redemptions").select(`*, venues:venue_id (name), venue_drinks:drink_id (category, brand_id)`).eq("user_id", userId).order("redeemed_at", { ascending: false }),
      supabase.from("user_activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      supabase.from("notification_logs").select("*").eq("user_id", userId).order("sent_at", { ascending: false }).limit(20)
    ]);

    const profile = profileResult.data;
    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const redemptions = redemptionsResult.data || [];
    const activityLogs = activityLogsResult.data || [];
    const notifications = notificationsResult.data || [];

    // Analyze patterns
    const detectedPatterns: BehaviorAnalysis["patterns"] = [];
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const recentRedemptions = redemptions.filter(r => new Date(r.redeemed_at).getTime() > thirtyDaysAgo);

    // Weekend Warrior check
    if (recentRedemptions.length >= 3) {
      const weekendRedemptions = recentRedemptions.filter(r => {
        const day = new Date(r.redeemed_at).getDay();
        return day === 0 || day === 5 || day === 6; // Fri, Sat, Sun
      });
      const weekendRatio = weekendRedemptions.length / recentRedemptions.length;
      if (weekendRatio >= 0.7) {
        detectedPatterns.push({
          ...PATTERNS.weekend_warrior,
          confidence: Math.round(weekendRatio * 100),
          evidence: `${weekendRedemptions.length}/${recentRedemptions.length} beváltás hétvégén`
        });
      }
    }

    // Happy Hour Hunter check
    if (recentRedemptions.length >= 3) {
      const happyHourRedemptions = recentRedemptions.filter(r => {
        const hour = new Date(r.redeemed_at).getHours();
        return hour >= 17 && hour < 19;
      });
      const happyHourRatio = happyHourRedemptions.length / recentRedemptions.length;
      if (happyHourRatio >= 0.5) {
        detectedPatterns.push({
          ...PATTERNS.happy_hour_hunter,
          confidence: Math.round(happyHourRatio * 100),
          evidence: `${happyHourRedemptions.length}/${recentRedemptions.length} beváltás 17-19h között`
        });
      }
    }

    // Night Owl check
    if (recentRedemptions.length >= 3) {
      const nightRedemptions = recentRedemptions.filter(r => {
        const hour = new Date(r.redeemed_at).getHours();
        return hour >= 21 || hour < 3;
      });
      const nightRatio = nightRedemptions.length / recentRedemptions.length;
      if (nightRatio >= 0.5) {
        detectedPatterns.push({
          ...PATTERNS.night_owl,
          confidence: Math.round(nightRatio * 100),
          evidence: `${nightRedemptions.length}/${recentRedemptions.length} beváltás 21:00 után`
        });
      }
    }

    // Venue Hopper check
    const uniqueVenues = new Set(recentRedemptions.map(r => r.venue_id));
    if (uniqueVenues.size >= 3) {
      detectedPatterns.push({
        ...PATTERNS.venue_hopper,
        confidence: Math.min(100, uniqueVenues.size * 25),
        evidence: `${uniqueVenues.size} különböző helyszín az elmúlt 30 napban`
      });
    }

    // Loyal Regular check
    if (recentRedemptions.length >= 5) {
      const venueCounts: Record<string, number> = {};
      recentRedemptions.forEach(r => {
        venueCounts[r.venue_id] = (venueCounts[r.venue_id] || 0) + 1;
      });
      const maxVenueCount = Math.max(...Object.values(venueCounts));
      const loyaltyRatio = maxVenueCount / recentRedemptions.length;
      if (loyaltyRatio >= 0.7) {
        const topVenueId = Object.entries(venueCounts).find(([, count]) => count === maxVenueCount)?.[0];
        const topVenueName = recentRedemptions.find(r => r.venue_id === topVenueId)?.venues?.name;
        detectedPatterns.push({
          ...PATTERNS.loyal_regular,
          confidence: Math.round(loyaltyRatio * 100),
          evidence: `${maxVenueCount}/${recentRedemptions.length} beváltás: ${topVenueName || "Ismeretlen helyszín"}`
        });
      }
    }

    // Ghost Mode check
    const appOpens = activityLogs.filter(l => l.event_type === "app_open" && new Date(l.created_at).getTime() > thirtyDaysAgo);
    if (appOpens.length >= 5 && recentRedemptions.length === 0) {
      detectedPatterns.push({
        ...PATTERNS.ghost_mode,
        confidence: Math.min(100, appOpens.length * 10),
        evidence: `${appOpens.length} app megnyitás, 0 beváltás az elmúlt 30 napban`
      });
    }

    // Power User check
    if (redemptions.length >= 20) {
      detectedPatterns.push({
        ...PATTERNS.power_user,
        confidence: Math.min(100, Math.round((redemptions.length / 50) * 100)),
        evidence: `${redemptions.length} összes beváltás`
      });
    }

    // Brand Loyal check
    if (recentRedemptions.length >= 5) {
      const drinkCounts: Record<string, number> = {};
      recentRedemptions.forEach(r => {
        const key = r.drink;
        drinkCounts[key] = (drinkCounts[key] || 0) + 1;
      });
      const maxDrinkCount = Math.max(...Object.values(drinkCounts));
      const brandLoyaltyRatio = maxDrinkCount / recentRedemptions.length;
      if (brandLoyaltyRatio >= 0.5) {
        const topDrink = Object.entries(drinkCounts).find(([, count]) => count === maxDrinkCount)?.[0];
        detectedPatterns.push({
          ...PATTERNS.brand_loyal,
          confidence: Math.round(brandLoyaltyRatio * 100),
          evidence: `${maxDrinkCount}/${recentRedemptions.length}: ${topDrink}`
        });
      }
    }

    // Calculate predictions
    const predictions: BehaviorAnalysis["predictions"] = {
      next_venue: null,
      next_day: null,
      next_hour: null,
      estimated_next_visit_days: null,
      optimal_push_time: null
    };

    if (redemptions.length >= 3) {
      // Predict next venue
      const venueCounts: Record<string, { count: number; name: string }> = {};
      redemptions.slice(0, 20).forEach(r => {
        if (!venueCounts[r.venue_id]) {
          venueCounts[r.venue_id] = { count: 0, name: r.venues?.name || "Unknown" };
        }
        venueCounts[r.venue_id].count++;
      });
      const topVenue = Object.entries(venueCounts).sort((a, b) => b[1].count - a[1].count)[0];
      if (topVenue) {
        predictions.next_venue = {
          venue_id: topVenue[0],
          venue_name: topVenue[1].name,
          probability: Math.round((topVenue[1].count / Math.min(20, redemptions.length)) * 100)
        };
      }

      // Predict next day
      const dayNames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
      const dayCounts: Record<number, number> = {};
      redemptions.slice(0, 20).forEach(r => {
        const day = new Date(r.redeemed_at).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
      if (topDay) {
        predictions.next_day = {
          day: parseInt(topDay[0]),
          dayName: dayNames[parseInt(topDay[0])],
          probability: Math.round((topDay[1] / Math.min(20, redemptions.length)) * 100)
        };
      }

      // Predict next hour
      const hourCounts: Record<number, number> = {};
      redemptions.slice(0, 20).forEach(r => {
        const hour = new Date(r.redeemed_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      if (topHour) {
        predictions.next_hour = {
          hour: parseInt(topHour[0]),
          probability: Math.round((topHour[1] / Math.min(20, redemptions.length)) * 100)
        };
      }

      // Estimate next visit
      if (redemptions.length >= 3) {
        const intervals: number[] = [];
        for (let i = 0; i < Math.min(10, redemptions.length - 1); i++) {
          const diff = new Date(redemptions[i].redeemed_at).getTime() - new Date(redemptions[i + 1].redeemed_at).getTime();
          intervals.push(diff / (1000 * 60 * 60 * 24)); // days
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        predictions.estimated_next_visit_days = Math.round(avgInterval);
      }

      // Optimal push time
      if (predictions.next_day && predictions.next_hour) {
        const pushHour = Math.max(10, predictions.next_hour.hour - 2);
        predictions.optimal_push_time = `${predictions.next_day.dayName} ${pushHour}:00`;
      }
    }

    // Detect micro-moments
    const microMoments: BehaviorAnalysis["micro_moments"] = [];

    // Check for "decision moment" - browsing activity
    const recentViews = activityLogs.filter(l => 
      l.event_type === "venue_viewed" && 
      new Date(l.created_at).getTime() > now - 60 * 60 * 1000 // last hour
    );
    if (recentViews.length >= 2) {
      microMoments.push({
        type: "decision_moment",
        title: "Döntési pillanat",
        description: `${recentViews.length} helyszínt nézett meg az elmúlt órában`,
        urgency: "high",
        action: "Azonnali push ajánlat küldése"
      });
    }

    // Check for "return window" - at risk of churning
    const daysSinceLastActivity = profile.last_seen_at
      ? Math.floor((now - new Date(profile.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    if (daysSinceLastActivity !== null && daysSinceLastActivity >= 12 && daysSinceLastActivity <= 16) {
      microMoments.push({
        type: "return_window",
        title: "Visszatérési ablak",
        description: `${daysSinceLastActivity} napja nem volt aktív - kritikus időszak`,
        urgency: "high",
        action: "Visszacsábító promóció küldése"
      });
    }

    // Check for "points threshold" - close to reward
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const { data: rewards } = await supabase
      .from("rewards")
      .select("points_required, name")
      .eq("active", true)
      .order("points_required", { ascending: true })
      .limit(5);

    if (pointsData && rewards && rewards.length > 0) {
      const nextReward = rewards.find(r => r.points_required > pointsData.balance);
      if (nextReward) {
        const pointsNeeded = nextReward.points_required - pointsData.balance;
        if (pointsNeeded <= 50) {
          microMoments.push({
            type: "points_threshold",
            title: "Pont-küszöb",
            description: `Már csak ${pointsNeeded} pont kell a "${nextReward.name}" jutalomhoz`,
            urgency: "medium",
            action: "Pont emlékeztető küldése"
          });
        }
      }
    }

    // Unopened notifications check
    const unopenedNotifications = notifications.filter(n => !n.opened_at).length;
    if (unopenedNotifications >= 3) {
      microMoments.push({
        type: "notification_fatigue",
        title: "Értesítés fáradtság",
        description: `${unopenedNotifications} olvasatlan értesítés - csökkenteni kell a frekvenciát`,
        urgency: "low",
        action: "Értesítési stratégia felülvizsgálata"
      });
    }

    // Cluster assignment (simplified)
    let cluster = null;
    if (detectedPatterns.length > 0) {
      const topPattern = detectedPatterns.sort((a, b) => b.confidence - a.confidence)[0];
      cluster = {
        id: topPattern.id,
        name: topPattern.nameHu,
        size: Math.floor(Math.random() * 50) + 10 // Placeholder - would need real clustering
      };
    }

    // Save patterns to database
    const patternsData = {
      user_id: userId,
      patterns: detectedPatterns,
      cluster_id: cluster?.id || null,
      cluster_name: cluster?.name || null,
      computed_at: new Date().toISOString()
    };

    await supabase
      .from("user_behavior_patterns")
      .upsert(patternsData, { onConflict: "user_id" });

    // Save predictions
    if (predictions.next_venue || predictions.next_day) {
      await supabase.from("user_predictions").insert({
        user_id: userId,
        prediction_type: "next_visit",
        prediction_data: predictions,
        confidence: predictions.next_venue?.probability || null
      });
    }

    const response: BehaviorAnalysis = {
      patterns: detectedPatterns,
      cluster,
      predictions,
      micro_moments: microMoments
    };

    console.log(`Behavior analysis completed for user ${userId}: ${detectedPatterns.length} patterns detected`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing user behavior:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
