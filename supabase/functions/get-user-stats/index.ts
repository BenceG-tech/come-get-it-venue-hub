import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT and verify admin
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

    // Check if user is admin
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

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user points
    const { data: points } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Fetch activity logs
    const { data: activityLogs } = await supabase
      .from("user_activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch redemptions with venue info
    const { data: redemptions } = await supabase
      .from("redemptions")
      .select(`
        *,
        venues:venue_id (name)
      `)
      .eq("user_id", userId)
      .order("redeemed_at", { ascending: false });

    // Fetch reward redemptions
    const { data: rewardRedemptions } = await supabase
      .from("reward_redemptions")
      .select(`
        *,
        rewards:reward_id (name, points_required),
        venues:venue_id (name)
      `)
      .eq("user_id", userId)
      .order("redeemed_at", { ascending: false });

    // Calculate stats
    const appOpenEvents = activityLogs?.filter(l => l.event_type === "app_open") || [];
    const appCloseEvents = activityLogs?.filter(l => l.event_type === "app_close") || [];
    
    // Calculate average session duration from app_close events with duration metadata
    const sessionsWithDuration = appCloseEvents.filter(e => e.metadata?.session_duration_seconds);
    const avgSessionDuration = sessionsWithDuration.length > 0
      ? Math.round(sessionsWithDuration.reduce((sum, e) => sum + (e.metadata.session_duration_seconds as number), 0) / sessionsWithDuration.length)
      : 0;

    // Find favorite venue
    const venueVisits: Record<string, { count: number; name: string }> = {};
    (redemptions || []).forEach(r => {
      const venueId = r.venue_id;
      const venueName = r.venues?.name || "Unknown";
      if (!venueVisits[venueId]) {
        venueVisits[venueId] = { count: 0, name: venueName };
      }
      venueVisits[venueId].count++;
    });

    const favoriteVenue = Object.entries(venueVisits)
      .sort(([, a], [, b]) => b.count - a.count)[0];

    // Find favorite drink
    const drinkCounts: Record<string, number> = {};
    (redemptions || []).forEach(r => {
      const drink = r.drink;
      drinkCounts[drink] = (drinkCounts[drink] || 0) + 1;
    });

    const favoriteDrink = Object.entries(drinkCounts)
      .sort(([, a], [, b]) => b - a)[0];

    // First and last activity
    const firstActivity = activityLogs?.length 
      ? activityLogs[activityLogs.length - 1].created_at 
      : profile.created_at;
    
    const lastActivity = profile.last_seen_at || 
      (activityLogs?.length ? activityLogs[0].created_at : null);

    const daysSinceLastActivity = lastActivity 
      ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : null;

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
      stats: {
        total_sessions: appOpenEvents.length,
        avg_session_duration_seconds: avgSessionDuration,
        total_free_drink_redemptions: redemptions?.length || 0,
        total_reward_redemptions: rewardRedemptions?.length || 0,
        favorite_venue: favoriteVenue ? {
          id: favoriteVenue[0],
          name: favoriteVenue[1].name,
          visit_count: favoriteVenue[1].count
        } : null,
        favorite_drink: favoriteDrink ? {
          name: favoriteDrink[0],
          count: favoriteDrink[1]
        } : null,
        first_seen: firstActivity,
        last_seen: lastActivity,
        days_since_last_activity: daysSinceLastActivity
      },
      recent_activity: (activityLogs || []).slice(0, 20).map(log => ({
        event_type: log.event_type,
        venue_id: log.venue_id,
        metadata: log.metadata,
        device_info: log.device_info,
        app_version: log.app_version,
        created_at: log.created_at
      })),
      free_drink_redemptions: (redemptions || []).map(r => ({
        id: r.id,
        venue_name: r.venues?.name || "Unknown",
        venue_id: r.venue_id,
        drink: r.drink,
        value: r.value,
        redeemed_at: r.redeemed_at
      })),
      reward_redemptions: (rewardRedemptions || []).map(r => ({
        id: r.id,
        venue_name: r.venues?.name || "Unknown",
        venue_id: r.venue_id,
        reward_name: r.rewards?.name || "Unknown",
        points_spent: r.rewards?.points_required || 0,
        redeemed_at: r.redeemed_at
      })),
      venue_affinity: Object.entries(venueVisits)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([id, data]) => ({
          venue_id: id,
          venue_name: data.name,
          visit_count: data.count
        }))
    };

    console.log(`User stats fetched for ${userId}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching user stats:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
