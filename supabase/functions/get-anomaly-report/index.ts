import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Anomaly {
  id: string;
  entity_type: 'user' | 'venue' | 'platform';
  entity_id?: string;
  entity_name?: string;
  anomaly_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  detected_at: string;
  resolved_at?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
}

interface AnomalyStats {
  total_30_days: number;
  critical_count: number;
  resolved_count: number;
  false_positive_rate: number;
}

interface AnomalyReport {
  active_anomalies: Anomaly[];
  recent_resolved: Anomaly[];
  stats: AnomalyStats;
  generated_at: string;
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdaySameHour = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get existing anomaly logs
    const { data: existingAnomalies } = await supabase
      .from("anomaly_logs")
      .select("*")
      .gte("detected_at", thirtyDaysAgo.toISOString())
      .order("detected_at", { ascending: false });

    // Detect new anomalies
    const newAnomalies: Anomaly[] = [];

    // 1. Venue activity anomalies
    const { data: venues } = await supabase
      .from("venues")
      .select("id, name")
      .eq("is_paused", false);

    const { data: todayRedemptions } = await supabase
      .from("redemptions")
      .select("venue_id, created_at")
      .gte("created_at", todayStart.toISOString());

    const { data: yesterdayRedemptions } = await supabase
      .from("redemptions")
      .select("venue_id, created_at")
      .gte("created_at", new Date(yesterdaySameHour.getFullYear(), yesterdaySameHour.getMonth(), yesterdaySameHour.getDate()).toISOString())
      .lt("created_at", yesterdaySameHour.toISOString());

    const todayByVenue = new Map<string, number>();
    const yesterdayByVenue = new Map<string, number>();

    todayRedemptions?.forEach(r => {
      if (r.venue_id) {
        todayByVenue.set(r.venue_id, (todayByVenue.get(r.venue_id) || 0) + 1);
      }
    });

    yesterdayRedemptions?.forEach(r => {
      if (r.venue_id) {
        yesterdayByVenue.set(r.venue_id, (yesterdayByVenue.get(r.venue_id) || 0) + 1);
      }
    });

    const venueMap = new Map(venues?.map(v => [v.id, v.name]) || []);

    // Check each venue for anomalies
    venueMap.forEach((name, venueId) => {
      const today = todayByVenue.get(venueId) || 0;
      const yesterday = yesterdayByVenue.get(venueId) || 0;

      // Spike detection: +100% vs yesterday
      if (yesterday > 5 && today > yesterday * 2) {
        const percentIncrease = Math.round((today / yesterday - 1) * 100);
        newAnomalies.push({
          id: `spike-${venueId}-${now.toISOString()}`,
          entity_type: 'venue',
          entity_id: venueId,
          entity_name: name,
          anomaly_type: 'activity_spike',
          severity: 'info',
          title: `${name}: +${percentIncrease}% beváltás`,
          description: `${today} beváltás ma vs ${yesterday} tegnap ugyanekkor`,
          detected_at: now.toISOString(),
          action_label: 'Céges rendezvény? Készlet ellenőrzés ajánlott',
          metadata: { today_count: today, yesterday_count: yesterday, percent_change: percentIncrease },
        });
      }

      // Drop detection: -50% vs yesterday
      if (yesterday > 10 && today < yesterday * 0.5) {
        const percentDecrease = Math.round((1 - today / yesterday) * 100);
        newAnomalies.push({
          id: `drop-${venueId}-${now.toISOString()}`,
          entity_type: 'venue',
          entity_id: venueId,
          entity_name: name,
          anomaly_type: 'activity_drop',
          severity: 'warning',
          title: `${name}: -${percentDecrease}% beváltás`,
          description: `${today} beváltás ma vs ${yesterday} tegnap - lassú nap vagy probléma?`,
          detected_at: now.toISOString(),
          action_label: 'Promóció ajánlott',
          metadata: { today_count: today, yesterday_count: yesterday, percent_change: -percentDecrease },
        });
      }
    });

    // 2. User behavior anomalies
    const { data: recentHighActivity } = await supabase
      .from("redemptions")
      .select("user_id, created_at")
      .gte("created_at", new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString());

    const userRedemptionCounts = new Map<string, number>();
    recentHighActivity?.forEach(r => {
      userRedemptionCounts.set(r.user_id, (userRedemptionCounts.get(r.user_id) || 0) + 1);
    });

    // Users with suspiciously high activity (5+ redemptions in 2 hours)
    const { data: userProfiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", Array.from(userRedemptionCounts.keys()));

    const profileMap = new Map(userProfiles?.map(p => [p.id, p.name]) || []);

    userRedemptionCounts.forEach((count, userId) => {
      if (count >= 5) {
        newAnomalies.push({
          id: `high-user-activity-${userId}-${now.toISOString()}`,
          entity_type: 'user',
          entity_id: userId,
          entity_name: profileMap.get(userId) || 'Ismeretlen',
          anomaly_type: 'unusual_user_activity',
          severity: count >= 8 ? 'critical' : 'warning',
          title: `${profileMap.get(userId) || 'User'}: ${count} beváltás 2 órán belül`,
          description: `Szokatlanul magas aktivitás - csoport szervezés vagy gyanús?`,
          detected_at: now.toISOString(),
          action_label: 'Vizsgálat szükséges',
          metadata: { redemption_count: count, period_hours: 2 },
        });
      }
    });

    // 3. Platform-level anomalies
    const totalToday = todayRedemptions?.length || 0;
    const totalYesterday = yesterdayRedemptions?.length || 0;

    if (totalYesterday > 20 && totalToday > totalYesterday * 1.5) {
      newAnomalies.push({
        id: `platform-spike-${now.toISOString()}`,
        entity_type: 'platform',
        anomaly_type: 'platform_activity_spike',
        severity: 'info',
        title: `Platform: +${Math.round((totalToday / totalYesterday - 1) * 100)}% aktivitás`,
        description: `${totalToday} beváltás ma vs ${totalYesterday} tegnap - kampány hatás?`,
        detected_at: now.toISOString(),
        action_label: 'Részletes elemzés',
        metadata: { today_total: totalToday, yesterday_total: totalYesterday },
      });
    }

    // Combine with existing unresolved anomalies
    const activeAnomalies: Anomaly[] = [
      ...newAnomalies,
      ...(existingAnomalies || [])
        .filter(a => !a.resolved_at)
        .map(a => ({
          id: a.id,
          entity_type: a.entity_type as 'user' | 'venue' | 'platform',
          entity_id: a.entity_id,
          anomaly_type: a.anomaly_type,
          severity: a.severity as 'critical' | 'warning' | 'info',
          title: a.title,
          description: a.description || '',
          detected_at: a.detected_at,
          metadata: a.metadata as Record<string, unknown>,
        })),
    ];

    // Get recently resolved for stats
    const recentResolved: Anomaly[] = (existingAnomalies || [])
      .filter(a => a.resolved_at)
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        entity_type: a.entity_type as 'user' | 'venue' | 'platform',
        entity_id: a.entity_id,
        anomaly_type: a.anomaly_type,
        severity: a.severity as 'critical' | 'warning' | 'info',
        title: a.title,
        description: a.description || '',
        detected_at: a.detected_at,
        resolved_at: a.resolved_at,
        metadata: a.metadata as Record<string, unknown>,
      }));

    // Calculate stats
    const allAnomalies = existingAnomalies || [];
    const stats: AnomalyStats = {
      total_30_days: allAnomalies.length + newAnomalies.length,
      critical_count: allAnomalies.filter(a => a.severity === 'critical').length + 
                      newAnomalies.filter(a => a.severity === 'critical').length,
      resolved_count: allAnomalies.filter(a => a.resolved_at).length,
      false_positive_rate: 0.12, // Placeholder - would need tracking
    };

    // Store new anomalies
    for (const anomaly of newAnomalies) {
      await supabase.from("anomaly_logs").insert({
        entity_type: anomaly.entity_type,
        entity_id: anomaly.entity_id,
        anomaly_type: anomaly.anomaly_type,
        severity: anomaly.severity,
        title: anomaly.title,
        description: anomaly.description,
        detected_at: anomaly.detected_at,
        metadata: anomaly.metadata,
      });
    }

    const report: AnomalyReport = {
      active_anomalies: activeAnomalies.slice(0, 20),
      recent_resolved: recentResolved,
      stats,
      generated_at: now.toISOString(),
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-anomaly-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
