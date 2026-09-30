import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function dateKey(value: string) {
  return value.split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = (req.headers.get("Authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) return jsonResponse({ error: "UNAUTHORIZED" }, 401);

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (authError || !user) return jsonResponse({ error: "UNAUTHORIZED" }, 401);

    const body = await req.json().catch(() => ({}));
    const requestedVenueId =
      typeof body?.venue_id === "string" && body.venue_id.length > 0
        ? body.venue_id
        : null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const isAdmin = profile?.is_admin === true;
    let venueId: string | null = requestedVenueId;

    if (!isAdmin) {
      if (!venueId) return jsonResponse({ error: "VENUE_ID_REQUIRED" }, 400);

      const [membershipResult, ownedVenueResult] = await Promise.all([
        supabase
          .from("venue_memberships")
          .select("venue_id, role")
          .eq("profile_id", user.id)
          .eq("venue_id", venueId)
          .eq("role", "venue_owner")
          .maybeSingle(),
        supabase
          .from("venues")
          .select("id")
          .eq("id", venueId)
          .eq("owner_profile_id", user.id)
          .maybeSingle(),
      ]);

      if (membershipResult.error) throw membershipResult.error;
      if (ownedVenueResult.error) throw ownedVenueResult.error;
      if (!membershipResult.data && !ownedVenueResult.data) {
        return jsonResponse({ error: "FORBIDDEN" }, 403);
      }
    }

    const url = new URL(req.url);
    const requestedDays = Number(body?.days ?? url.searchParams.get("days") ?? 30);
    const days = Number.isFinite(requestedDays)
      ? Math.min(365, Math.max(14, Math.trunc(requestedDays)))
      : 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startDateIso = startDate.toISOString();

    let redemptionQuery = supabase
      .from("redemptions")
      .select("user_id, redeemed_at, venue_id")
      .gte("redeemed_at", startDateIso)
      .order("redeemed_at", { ascending: true });
    if (venueId) redemptionQuery = redemptionQuery.eq("venue_id", venueId);

    const { data: redemptionRows, error: redemptionError } = await redemptionQuery;
    if (redemptionError) throw redemptionError;
    const redemptions = redemptionRows ?? [];

    // Platform admins use app activity; venue partners only receive activity
    // derived from redemptions at their own venue.
    let activityRows: Array<{ user_id: string; created_at: string }> = [];
    if (isAdmin && !venueId) {
      const { data, error } = await supabase
        .from("user_activity_logs")
        .select("user_id, created_at")
        .gte("created_at", startDateIso);
      if (error) throw error;
      activityRows = data ?? [];
    } else {
      activityRows = redemptions.map((row) => ({
        user_id: row.user_id,
        created_at: row.redeemed_at,
      }));
    }

    const dailyUsers = new Map<string, Set<string>>();
    const weeklyUsers = new Map<string, Set<string>>();
    for (const activity of activityRows) {
      const day = dateKey(activity.created_at);
      if (!dailyUsers.has(day)) dailyUsers.set(day, new Set());
      dailyUsers.get(day)!.add(activity.user_id);

      const date = new Date(activity.created_at);
      const weekStart = new Date(date);
      weekStart.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      const week = dateKey(weekStart.toISOString());
      if (!weeklyUsers.has(week)) weeklyUsers.set(week, new Set());
      weeklyUsers.get(week)!.add(activity.user_id);
    }

    const daily_active_users = Array.from(dailyUsers.entries())
      .map(([date, users]) => ({ date, count: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const weekly_active_users = Array.from(weeklyUsers.entries())
      .map(([week_start, users]) => ({ week_start, count: users.size }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));

    const redemptionsByDate = new Map<string, { count: number; users: Set<string> }>();
    const venueRedemptions = new Map<string, { count: number; users: Set<string> }>();
    const firstRedemptionByUser = new Map<string, string>();

    for (const redemption of redemptions) {
      const day = dateKey(redemption.redeemed_at);
      if (!redemptionsByDate.has(day)) {
        redemptionsByDate.set(day, { count: 0, users: new Set() });
      }
      const dayEntry = redemptionsByDate.get(day)!;
      dayEntry.count += 1;
      dayEntry.users.add(redemption.user_id);

      if (redemption.venue_id) {
        if (!venueRedemptions.has(redemption.venue_id)) {
          venueRedemptions.set(redemption.venue_id, { count: 0, users: new Set() });
        }
        const venueEntry = venueRedemptions.get(redemption.venue_id)!;
        venueEntry.count += 1;
        venueEntry.users.add(redemption.user_id);
      }

      const first = firstRedemptionByUser.get(redemption.user_id);
      if (!first || redemption.redeemed_at < first) {
        firstRedemptionByUser.set(redemption.user_id, redemption.redeemed_at);
      }
    }

    const redemption_trends = Array.from(redemptionsByDate.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        unique_users: data.users.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const currentWeekRedemptions = redemption_trends
      .filter((row) => new Date(row.date) >= oneWeekAgo)
      .map((row) => ({ date: row.date, redemptions: row.count }));
    const previousWeekRedemptions = redemption_trends
      .filter((row) => new Date(row.date) >= twoWeeksAgo && new Date(row.date) < oneWeekAgo)
      .map((row) => ({ date: row.date, redemptions: row.count }));

    let newUsers = 0;
    let returningUsers = 0;
    const usersCountedThisWeek = new Set<string>();
    for (const redemption of redemptions) {
      if (new Date(redemption.redeemed_at) < oneWeekAgo) continue;
      if (usersCountedThisWeek.has(redemption.user_id)) continue;
      usersCountedThisWeek.add(redemption.user_id);
      const first = firstRedemptionByUser.get(redemption.user_id);
      if (first && new Date(first) >= oneWeekAgo) newUsers += 1;
      else returningUsers += 1;
    }

    const venueIds = Array.from(venueRedemptions.keys());
    const { data: venueRows, error: venueError } = await supabase
      .from("venues")
      .select("id, name")
      .in("id", venueIds.length > 0 ? venueIds : ["00000000-0000-0000-0000-000000000000"]);
    if (venueError) throw venueError;
    const venueNames = new Map((venueRows ?? []).map((row) => [row.id, row.name]));
    const top_venues = Array.from(venueRedemptions.entries())
      .map(([id, data]) => ({
        venue_id: id,
        venue_name: venueNames.get(id) ?? "Ismeretlen helyszín",
        redemption_count: data.count,
        unique_users: data.users.size,
      }))
      .sort((a, b) => b.redemption_count - a.redemption_count)
      .slice(0, 5);

    const hourly_activity: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const activity of activityRows) {
      const date = new Date(activity.created_at);
      const day = (date.getDay() + 6) % 7;
      hourly_activity[day][date.getHours()] += 1;
    }

    // Signup cohorts are platform-level user data, so they are returned only
    // to CGI admins requesting the platform scope. Venue analytics remain
    // derived exclusively from redemptions at the authorized venue.
    let retention_cohorts: Array<Record<string, string | number>> = [];
    if (isAdmin && !venueId) {
      const { data: profileRows, error: cohortError } = await supabase
        .from("profiles")
        .select("id, created_at")
        .gte("created_at", startDateIso);
      if (cohortError) throw cohortError;

      const cohorts = new Map<string, Set<string>>();
      for (const row of profileRows ?? []) {
        if (!row.created_at) continue;
        const createdAt = new Date(row.created_at);
        const weekStart = new Date(createdAt);
        weekStart.setUTCDate(createdAt.getUTCDate() - ((createdAt.getUTCDay() + 6) % 7));
        const weekKey = dateKey(weekStart.toISOString());
        if (!cohorts.has(weekKey)) cohorts.set(weekKey, new Set());
        cohorts.get(weekKey)!.add(row.id);
      }

      retention_cohorts = Array.from(cohorts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-4)
        .map(([cohortWeek, users]) => {
          const result: Record<string, string | number> = {
            cohort_week: cohortWeek,
            cohort_size: users.size,
            week_0: 100,
          };
          const cohortStart = new Date(`${cohortWeek}T00:00:00.000Z`);

          for (let weekIndex = 1; weekIndex <= 4; weekIndex += 1) {
            const weekStart = new Date(cohortStart);
            weekStart.setUTCDate(cohortStart.getUTCDate() + weekIndex * 7);
            if (weekStart > now) break;

            const weekEnd = new Date(weekStart);
            weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
            const activeUsers = new Set(
              activityRows
                .filter((activity) => {
                  if (!users.has(activity.user_id)) return false;
                  const activityDate = new Date(activity.created_at);
                  return activityDate >= weekStart && activityDate < weekEnd;
                })
                .map((activity) => activity.user_id),
            );
            result[`week_${weekIndex}`] =
              users.size > 0 ? Math.round((activeUsers.size / users.size) * 100) : 0;
          }

          return result;
        });
    }

    const distinctUsers = new Set(redemptions.map((row) => row.user_id));
    let totalUsers = distinctUsers.size;
    if (isAdmin && !venueId) {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      totalUsers = count ?? 0;
    }

    const today = dateKey(now.toISOString());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const active7Days = new Set(
      activityRows
        .filter((row) => new Date(row.created_at) >= sevenDaysAgo)
        .map((row) => row.user_id),
    ).size;
    const active30Days = new Set(
      activityRows
        .filter((row) => new Date(row.created_at) >= thirtyDaysAgo)
        .map((row) => row.user_id),
    ).size;

    const summary = {
      total_users: totalUsers,
      active_today: dailyUsers.get(today)?.size ?? 0,
      active_7_days: active7Days,
      active_30_days: active30Days,
      total_redemptions: redemptions.length,
      avg_sessions_per_user:
        active30Days > 0 ? Math.round((activityRows.length / active30Days) * 10) / 10 : 0,
      avg_redemptions_per_user:
        distinctUsers.size > 0
          ? Math.round((redemptions.length / distinctUsers.size) * 10) / 10
          : 0,
    };

    console.log(
      `[get-user-analytics] scope=${venueId ? "venue" : "platform"} days=${days} redemptions=${redemptions.length}`,
    );

    return jsonResponse({
      daily_active_users,
      weekly_active_users,
      retention_cohorts,
      redemption_trends,
      top_venues,
      hourly_activity,
      summary,
      redemption_timeseries: {
        current_week: currentWeekRedemptions,
        previous_week: previousWeekRedemptions,
      },
      user_activity: {
        new_users: newUsers,
        returning_users: returningUsers,
      },
    });
  } catch (error) {
    console.error(
      "[get-user-analytics] error",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500);
  }
});
