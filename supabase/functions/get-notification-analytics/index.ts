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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const templateId = url.searchParams.get("template_id");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all notification logs for the period
    let logsQuery = supabase
      .from("notification_logs")
      .select("*")
      .gte("sent_at", startDate.toISOString())
      .order("sent_at", { ascending: false });

    if (templateId) {
      logsQuery = logsQuery.eq("template_id", templateId);
    }

    const { data: logs, error: logsError } = await logsQuery;

    if (logsError) {
      throw logsError;
    }

    // Calculate aggregate metrics
    const totalSent = logs?.length || 0;
    const delivered = logs?.filter(l => l.delivered_at).length || 0;
    const opened = logs?.filter(l => l.opened_at).length || 0;
    const clicked = logs?.filter(l => l.clicked_at).length || 0;
    const failed = logs?.filter(l => l.status === 'failed').length || 0;

    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;

    // Group by day for time series
    const dailyStats: Record<string, { sent: number; delivered: number; opened: number; clicked: number }> = {};
    
    logs?.forEach(log => {
      const day = log.sent_at.split("T")[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
      }
      dailyStats[day].sent++;
      if (log.delivered_at) dailyStats[day].delivered++;
      if (log.opened_at) dailyStats[day].opened++;
      if (log.clicked_at) dailyStats[day].clicked++;
    });

    const timeSeries = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by template for performance comparison
    const templateStats: Record<string, { 
      template_id: string;
      title: string;
      sent: number; 
      delivered: number; 
      opened: number; 
      clicked: number;
      open_rate: number;
      click_rate: number;
    }> = {};
    
    logs?.forEach(log => {
      const tid = log.template_id || 'manual';
      if (!templateStats[tid]) {
        templateStats[tid] = { 
          template_id: tid, 
          title: log.title || 'Manual Notification',
          sent: 0, 
          delivered: 0, 
          opened: 0, 
          clicked: 0,
          open_rate: 0,
          click_rate: 0
        };
      }
      templateStats[tid].sent++;
      if (log.delivered_at) templateStats[tid].delivered++;
      if (log.opened_at) templateStats[tid].opened++;
      if (log.clicked_at) templateStats[tid].clicked++;
    });

    // Calculate rates for each template
    const topTemplates = Object.values(templateStats)
      .map(t => ({
        ...t,
        open_rate: t.delivered > 0 ? (t.opened / t.delivered) * 100 : 0,
        click_rate: t.opened > 0 ? (t.clicked / t.opened) * 100 : 0,
      }))
      .sort((a, b) => b.open_rate - a.open_rate)
      .slice(0, 10);

    // Group by platform
    const platformStats: Record<string, { sent: number; delivered: number; opened: number }> = {};
    logs?.forEach(log => {
      const platform = log.platform || 'unknown';
      if (!platformStats[platform]) {
        platformStats[platform] = { sent: 0, delivered: 0, opened: 0 };
      }
      platformStats[platform].sent++;
      if (log.delivered_at) platformStats[platform].delivered++;
      if (log.opened_at) platformStats[platform].opened++;
    });

    // Get hourly distribution for best send time analysis
    const hourlyOpens: number[] = new Array(24).fill(0);
    logs?.forEach(log => {
      if (log.opened_at) {
        const hour = new Date(log.opened_at).getHours();
        hourlyOpens[hour]++;
      }
    });

    const bestHour = hourlyOpens.indexOf(Math.max(...hourlyOpens));

    return new Response(
      JSON.stringify({
        summary: {
          total_sent: totalSent,
          delivered: delivered,
          opened: opened,
          clicked: clicked,
          failed: failed,
          delivery_rate: Math.round(deliveryRate * 10) / 10,
          open_rate: Math.round(openRate * 10) / 10,
          click_rate: Math.round(clickRate * 10) / 10,
        },
        time_series: timeSeries,
        top_templates: topTemplates,
        platform_breakdown: Object.entries(platformStats).map(([platform, stats]) => ({
          platform,
          ...stats,
          delivery_rate: stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 1000) / 10 : 0,
          open_rate: stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 1000) / 10 : 0,
        })),
        best_send_time: {
          hour: bestHour,
          opens_at_best_hour: hourlyOpens[bestHour],
          hourly_distribution: hourlyOpens,
        },
        period_days: days,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Notification analytics error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
