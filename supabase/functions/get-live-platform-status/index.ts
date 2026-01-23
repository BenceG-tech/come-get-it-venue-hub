import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VenueActivity {
  venue_id: string;
  venue_name: string;
  active_count: number;
  redemptions_today: number;
}

interface RecentActivity {
  id: string;
  type: 'redemption' | 'app_open' | 'venue_browse' | 'points_earned';
  user_id: string;
  user_name: string;
  venue_name?: string;
  drink_name?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  entity_type: 'venue' | 'user' | 'platform';
  entity_id?: string;
  entity_name?: string;
  action_label?: string;
  detected_at: string;
}

interface PlatformStatus {
  timestamp: string;
  metrics: {
    active_users_now: number;
    active_users_change: number;
    redemptions_per_minute: number;
    redemptions_change: number;
    hottest_venue: {
      id: string;
      name: string;
      active_count: number;
    } | null;
  };
  venue_activity: VenueActivity[];
  recent_feed: RecentActivity[];
  alerts: Alert[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get recent activity logs (last 5 minutes for "active users")
    const { data: recentActivity, error: activityError } = await supabase
      .from("user_activity_logs")
      .select("id, user_id, event_type, venue_id, metadata, created_at")
      .gte("created_at", fiveMinutesAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (activityError) {
      console.error("Error fetching activity:", activityError);
    }

    // Count unique active users in last 5 minutes
    const activeUserIds = new Set(recentActivity?.map(a => a.user_id) || []);
    const activeUsersNow = activeUserIds.size;

    // Get activity from 5-10 minutes ago for comparison
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const { data: previousActivity } = await supabase
      .from("user_activity_logs")
      .select("user_id")
      .gte("created_at", tenMinutesAgo.toISOString())
      .lt("created_at", fiveMinutesAgo.toISOString());

    const previousActiveUsers = new Set(previousActivity?.map(a => a.user_id) || []).size;
    const activeUsersChange = activeUsersNow - previousActiveUsers;

    // Get redemptions in last hour
    const { data: recentRedemptions } = await supabase
      .from("redemptions")
      .select("id, venue_id, user_id, created_at, drink_name")
      .gte("created_at", oneHourAgo.toISOString())
      .order("created_at", { ascending: false });

    const redemptionsLastHour = recentRedemptions?.length || 0;
    const redemptionsPerMinute = Math.round((redemptionsLastHour / 60) * 10) / 10;

    // Get redemptions in previous hour for comparison
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const { data: previousRedemptions } = await supabase
      .from("redemptions")
      .select("id")
      .gte("created_at", twoHoursAgo.toISOString())
      .lt("created_at", oneHourAgo.toISOString());

    const previousPerMinute = Math.round(((previousRedemptions?.length || 0) / 60) * 10) / 10;
    const redemptionsChange = Math.round((redemptionsPerMinute - previousPerMinute) * 10) / 10;

    // Get all venues for activity mapping
    const { data: venues } = await supabase
      .from("venues")
      .select("id, name")
      .eq("is_paused", false);

    const venueMap = new Map(venues?.map(v => [v.id, v.name]) || []);

    // Calculate venue activity (redemptions today + recent activity)
    const { data: todayRedemptions } = await supabase
      .from("redemptions")
      .select("venue_id")
      .gte("created_at", todayStart.toISOString());

    const venueRedemptionCounts = new Map<string, number>();
    todayRedemptions?.forEach(r => {
      if (r.venue_id) {
        venueRedemptionCounts.set(r.venue_id, (venueRedemptionCounts.get(r.venue_id) || 0) + 1);
      }
    });

    const venueActivityCounts = new Map<string, number>();
    recentActivity?.forEach(a => {
      if (a.venue_id) {
        venueActivityCounts.set(a.venue_id, (venueActivityCounts.get(a.venue_id) || 0) + 1);
      }
    });

    const venueActivity: VenueActivity[] = Array.from(venueMap.entries())
      .map(([id, name]) => ({
        venue_id: id,
        venue_name: name,
        active_count: venueActivityCounts.get(id) || 0,
        redemptions_today: venueRedemptionCounts.get(id) || 0,
      }))
      .sort((a, b) => b.active_count - a.active_count);

    // Find hottest venue
    const hottestVenue = venueActivity[0]?.active_count > 0
      ? {
          id: venueActivity[0].venue_id,
          name: venueActivity[0].venue_name,
          active_count: venueActivity[0].active_count,
        }
      : null;

    // Get user names for feed
    const userIds = Array.from(activeUserIds);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds.slice(0, 20));

    const userNameMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    // Build recent feed
    const recentFeed: RecentActivity[] = (recentActivity || [])
      .slice(0, 15)
      .map(activity => {
        const eventType = activity.event_type as string;
        let type: RecentActivity['type'] = 'app_open';
        if (eventType === 'redemption' || eventType === 'free_drink_claimed') type = 'redemption';
        else if (eventType === 'venue_view') type = 'venue_browse';
        else if (eventType === 'points_earned') type = 'points_earned';

        return {
          id: activity.id,
          type,
          user_id: activity.user_id,
          user_name: userNameMap.get(activity.user_id) || 'Ismeretlen felhasználó',
          venue_name: activity.venue_id ? venueMap.get(activity.venue_id) : undefined,
          drink_name: (activity.metadata as Record<string, unknown>)?.drink_name as string | undefined,
          timestamp: activity.created_at,
          metadata: activity.metadata as Record<string, unknown>,
        };
      });

    // Generate alerts based on anomalies
    const alerts: Alert[] = [];

    // Check for venues with unusual activity
    const avgRedemptions = venueActivity.length > 0
      ? venueActivity.reduce((sum, v) => sum + v.redemptions_today, 0) / venueActivity.length
      : 0;

    venueActivity.forEach(venue => {
      // Alert for venues significantly below average
      if (avgRedemptions > 5 && venue.redemptions_today < avgRedemptions * 0.3) {
        alerts.push({
          id: `low-activity-${venue.venue_id}`,
          severity: 'warning',
          type: 'low_activity',
          title: `${venue.venue_name}: Alacsony aktivitás`,
          description: `${venue.redemptions_today} beváltás ma (átlag: ${Math.round(avgRedemptions)})`,
          entity_type: 'venue',
          entity_id: venue.venue_id,
          entity_name: venue.venue_name,
          action_label: 'Promóció ajánlott',
          detected_at: now.toISOString(),
        });
      }

      // Alert for record activity
      if (venue.redemptions_today > avgRedemptions * 2.5 && venue.redemptions_today > 10) {
        alerts.push({
          id: `high-activity-${venue.venue_id}`,
          severity: 'info',
          type: 'record_day',
          title: `${venue.venue_name}: Rekord nap!`,
          description: `${venue.redemptions_today} beváltás (${Math.round(venue.redemptions_today / avgRedemptions * 100 - 100)}%+ az átlaghoz képest)`,
          entity_type: 'venue',
          entity_id: venue.venue_id,
          entity_name: venue.venue_name,
          action_label: 'Social post opportunity',
          detected_at: now.toISOString(),
        });
      }
    });

    // Check for power users who haven't been active
    const { data: powerUsers } = await supabase
      .from("user_points")
      .select("user_id, balance, lifetime_earned, last_transaction_at")
      .gte("lifetime_earned", 500)
      .order("lifetime_earned", { ascending: false })
      .limit(50);

    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const inactivePowerUsers = powerUsers?.filter(u => 
      u.last_transaction_at && new Date(u.last_transaction_at) < tenDaysAgo
    ) || [];

    if (inactivePowerUsers.length > 0) {
      alerts.push({
        id: 'inactive-power-users',
        severity: 'critical',
        type: 'churn_risk',
        title: `${inactivePowerUsers.length} power user inaktív`,
        description: `${inactivePowerUsers.length} magas értékű felhasználó 10+ napja nem aktív`,
        entity_type: 'platform',
        action_label: 'Reaktiválás sürgős',
        detected_at: now.toISOString(),
      });
    }

    const platformStatus: PlatformStatus = {
      timestamp: now.toISOString(),
      metrics: {
        active_users_now: activeUsersNow,
        active_users_change: activeUsersChange,
        redemptions_per_minute: redemptionsPerMinute,
        redemptions_change: redemptionsChange,
        hottest_venue: hottestVenue,
      },
      venue_activity: venueActivity.slice(0, 10),
      recent_feed: recentFeed,
      alerts: alerts.slice(0, 10),
    };

    // Store snapshot for historical data
    await supabase.from("platform_snapshots").insert({
      snapshot_time: now.toISOString(),
      active_users: activeUsersNow,
      redemptions_last_hour: redemptionsLastHour,
      redemptions_last_5min: recentRedemptions?.filter(r => 
        new Date(r.created_at) >= fiveMinutesAgo
      ).length || 0,
      hottest_venue_id: hottestVenue?.id,
      hottest_venue_count: hottestVenue?.active_count || 0,
      venue_activity: venueActivity,
      alerts: alerts,
    });

    return new Response(JSON.stringify(platformStatus), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-live-platform-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
