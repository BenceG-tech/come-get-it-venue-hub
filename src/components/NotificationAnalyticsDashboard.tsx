import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Send, Eye, MousePointer, Clock } from "lucide-react";

interface NotificationAnalytics {
  summary: {
    total_sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
  };
  time_series: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
  top_templates: Array<{
    template_id: string;
    title: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    open_rate: number;
    click_rate: number;
  }>;
  platform_breakdown: Array<{
    platform: string;
    sent: number;
    delivered: number;
    opened: number;
    delivery_rate: number;
    open_rate: number;
  }>;
  best_send_time: {
    hour: number;
    opens_at_best_hour: number;
    hourly_distribution: number[];
  };
  period_days: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#22c55e", "#eab308"];

export function NotificationAnalyticsDashboard() {
  const { data, isLoading, error } = useQuery<NotificationAnalytics>({
    queryKey: ["notification-analytics"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/get-notification-analytics?days=30`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-cgi-muted-foreground">
          Nem sikerült betölteni az analitikát. Próbáld újra később.
        </p>
      </Card>
    );
  }

  const hourlyData = data.best_send_time.hourly_distribution.map((opens, hour) => ({
    hour: `${hour}:00`,
    opens,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cgi-muted-foreground">Elküldve</p>
                <p className="text-2xl font-bold text-cgi-surface-foreground">
                  {data.summary.total_sent.toLocaleString()}
                </p>
              </div>
              <Send className="h-8 w-8 text-primary opacity-50" />
            </div>
            <p className="text-xs text-cgi-muted-foreground mt-1">
              Elmúlt {data.period_days} nap
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cgi-muted-foreground">Kézbesítési arány</p>
                <p className="text-2xl font-bold text-cgi-surface-foreground">
                  {data.summary.delivery_rate}%
                </p>
              </div>
              {data.summary.delivery_rate >= 95 ? (
                <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50" />
              ) : (
                <TrendingDown className="h-8 w-8 text-destructive opacity-50" />
              )}
            </div>
            <p className="text-xs text-cgi-muted-foreground mt-1">
              {data.summary.delivered.toLocaleString()} kézbesítve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cgi-muted-foreground">Megnyitási arány</p>
                <p className="text-2xl font-bold text-cgi-surface-foreground">
                  {data.summary.open_rate}%
                </p>
              </div>
              <Eye className="h-8 w-8 text-primary opacity-50" />
            </div>
            <p className="text-xs text-cgi-muted-foreground mt-1">
              {data.summary.opened.toLocaleString()} megnyitva
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cgi-muted-foreground">Átkattintás</p>
                <p className="text-2xl font-bold text-cgi-surface-foreground">
                  {data.summary.click_rate}%
                </p>
              </div>
              <MousePointer className="h-8 w-8 text-primary opacity-50" />
            </div>
            <p className="text-xs text-cgi-muted-foreground mt-1">
              {data.summary.clicked.toLocaleString()} kattintás
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Értesítések időbeli alakulása</CardTitle>
        </CardHeader>
        <CardContent>
          {data.time_series.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.time_series}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))" 
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString("hu-HU")}
                />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="hsl(var(--primary))" 
                  name="Elküldve"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="opened" 
                  stroke="hsl(var(--secondary))" 
                  name="Megnyitva"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-cgi-muted-foreground">
              Nincs elég adat a megjelenítéshez
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Best Send Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Legjobb küldési időpont
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {data.best_send_time.hour}:00
              </Badge>
              <p className="text-sm text-cgi-muted-foreground mt-2">
                Ezen az órában nyitották meg a legtöbb értesítést
              </p>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={hourlyData}>
                <Bar dataKey="opens" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10 }}
                  interval={3}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))" 
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform bontás</CardTitle>
          </CardHeader>
          <CardContent>
            {data.platform_breakdown.length > 0 ? (
              <div className="space-y-3">
                {data.platform_breakdown.map((platform, index) => (
                  <div key={platform.platform} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium capitalize">
                        {platform.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-cgi-muted-foreground">
                        {platform.sent} küldve
                      </span>
                      <Badge variant="outline">
                        {platform.open_rate}% open
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-cgi-muted-foreground text-center py-8">
                Nincs platform adat
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legjobban teljesítő sablonok</CardTitle>
        </CardHeader>
        <CardContent>
          {data.top_templates.length > 0 ? (
            <div className="space-y-3">
              {data.top_templates.map((template, index) => (
                <div 
                  key={template.template_id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-cgi-muted-foreground">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-cgi-surface-foreground">
                        {template.title}
                      </p>
                      <p className="text-sm text-cgi-muted-foreground">
                        {template.sent} elküldve
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {template.open_rate.toFixed(1)}% open
                    </Badge>
                    <Badge variant="outline">
                      {template.click_rate.toFixed(1)}% click
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-cgi-muted-foreground text-center py-8">
              Nincs sablon adat
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
