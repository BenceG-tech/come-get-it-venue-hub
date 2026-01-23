import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { PageLayout } from "@/components/PageLayout";
import { ChartCard } from "@/components/ChartCard";
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import AnalyticsHeatmapMobile from '@/components/AnalyticsHeatmapMobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

const COLORS = ['#1fb1b7', '#0d9488'];

interface AnalyticsResponse {
  redemption_timeseries: {
    current_week: { date: string; redemptions: number }[];
    previous_week: { date: string; redemptions: number }[];
  };
  user_activity: {
    new_users: number;
    returning_users: number;
  };
  hourly_activity: number[][];
}

export default function Analytics() {
  const [selectedCell, setSelectedCell] = useState<{ day: string; hour: number; value: number } | null>(null);
  const isMobile = useIsMobile();

  const { data: analyticsData, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: ["venue-analytics"],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("get-user-analytics", {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });
      if (response.error) throw response.error;
      return response.data;
    },
  });

  // Extract data with fallbacks for empty state
  const redemption_timeseries = analyticsData?.redemption_timeseries || {
    current_week: [],
    previous_week: [],
  };
  const user_activity = analyticsData?.user_activity || {
    new_users: 0,
    returning_users: 0,
  };
  const hourly_heatmap = analyticsData?.hourly_activity || Array.from({ length: 7 }, () => Array(24).fill(0));
  
  const pieData = [
    { name: 'Új felhasználók', value: user_activity.new_users },
    { name: 'Visszatérő felhasználók', value: user_activity.returning_users }
  ];

  const hasPieData = user_activity.new_users > 0 || user_activity.returning_users > 0;
  const hasRedemptionData = redemption_timeseries.current_week.length > 0;

  const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
  const dayAbbr = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHeatmapColor = (value: number) => {
    const max = Math.max(...hourly_heatmap.flat());
    if (max === 0) return 'hsl(var(--cgi-muted))';
    const intensity = value / max;
    
    if (intensity === 0) return 'hsl(var(--cgi-muted))';
    if (intensity < 0.2) return 'rgba(6, 182, 212, 0.2)';
    if (intensity < 0.4) return 'rgba(6, 182, 212, 0.4)';
    if (intensity < 0.6) return 'rgba(6, 182, 212, 0.6)';
    if (intensity < 0.8) return 'rgba(6, 182, 212, 0.8)';
    return 'rgba(6, 182, 212, 1)';
  };

  const handleCellClick = (dayIndex: number, hour: number, value: number) => {
    setSelectedCell({
      day: days[dayIndex],
      hour,
      value
    });
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-64 text-cgi-muted-foreground">
      <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <PageLayout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Analitika</h1>
          <p className="text-cgi-muted-foreground">
            Részletes jelentések és elemzések a helyszín teljesítményéről
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          Hiba történt az adatok betöltésekor. Kérjük, próbálja újra később.
        </div>
      )}

      {/* Redemption Timeseries */}
      <ChartCard 
        title="Italbeváltások idősor" 
        className="mb-8"
        tooltip="Ez a grafikon mutatja az italbeváltások számának alakulását az aktuális és az előző hét során. A folyamatos vonal az aktuális hetet, a szaggatott vonal az előző hetet jelöli."
      >
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : !hasRedemptionData ? (
          <EmptyState message="Nincs elegendő beváltási adat a megjelenítéshez" />
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
            <LineChart data={redemption_timeseries.current_week}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--cgi-muted))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--cgi-muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="hsl(var(--cgi-muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--cgi-surface))', 
                  border: '1px solid hsl(var(--cgi-muted))',
                  borderRadius: '8px',
                  color: 'hsl(var(--cgi-surface-foreground))'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="redemptions" 
                stroke="#1fb1b7" 
                strokeWidth={2}
                name="Aktuális hét"
                dot={{ fill: '#1fb1b7', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="redemptions" 
                data={redemption_timeseries.previous_week}
                stroke="#1fb1b7" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Előző hét"
                dot={{ fill: '#1fb1b7', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Activity Pie Chart */}
        <ChartCard 
          title="Felhasználói aktivitás"
          tooltip="Ez a kördiagram az új és visszatérő felhasználók arányát mutatja. Az új felhasználók először használják a rendszert, míg a visszatérő felhasználók már korábban is aktívak voltak."
        >
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : !hasPieData ? (
            <EmptyState message="Nincs elegendő felhasználói adat" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--cgi-surface))', 
                      border: '1px solid hsl(var(--cgi-muted))',
                      borderRadius: '8px',
                      color: 'hsl(var(--cgi-surface-foreground))'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4 flex-wrap">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm text-cgi-surface-foreground">
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* Redesigned Hourly Heatmap - Show mobile version on small screens */}
        <ChartCard 
          title="Óránkénti csúcsok"
          tooltip="Ez a hőtérkép a hét minden napjára és 24 órára lebontva mutatja az italbeváltások számát. A sötétebb színek magasabb aktivitást jeleznek."
        >
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : isMobile ? (
            <AnalyticsHeatmapMobile heatmapData={hourly_heatmap} />
          ) : (
            <div className="space-y-4">
              {/* Hour Labels */}
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex mb-2">
                    <div className="w-12"></div>
                    {hours.filter((_, i) => i % 3 === 0).map((hour) => (
                      <div key={hour} className="flex-1 text-center text-xs text-cgi-muted-foreground min-w-[20px]">
                        {hour}h
                      </div>
                    ))}
                  </div>
                  
                  {/* Heatmap Grid */}
                  <div className="space-y-1">
                    {days.map((day, dayIndex) => (
                      <div key={day} className="flex items-center gap-1">
                        <div className="w-12 text-xs text-cgi-muted-foreground text-right pr-2 font-medium">
                          {dayAbbr[dayIndex]}
                        </div>
                        <div className="flex gap-px flex-1">
                          {hourly_heatmap[dayIndex].map((value, hourIndex) => (
                            <div
                              key={`${dayIndex}-${hourIndex}`}
                              className="h-6 flex-1 min-w-[8px] rounded-sm border border-cgi-muted/20 cursor-pointer hover:ring-2 hover:ring-cgi-primary transition-all duration-200"
                              style={{ backgroundColor: getHeatmapColor(value) }}
                              title={`${day} ${hours[hourIndex]}:00 - ${value} beváltás`}
                              onClick={() => handleCellClick(dayIndex, hourIndex, value)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-xs text-cgi-muted-foreground">
                <span>Kevesebb</span>
                <div className="flex gap-1">
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                    <div
                      key={intensity}
                      className="h-4 w-4 rounded border border-cgi-muted/20"
                      style={{ backgroundColor: intensity === 0 ? 'hsl(var(--cgi-muted))' : `rgba(6, 182, 212, ${intensity})` }}
                    />
                  ))}
                </div>
                <span>Több</span>
              </div>

              {/* Selected Cell Info */}
              {selectedCell && (
                <div className="mt-4 p-3 bg-cgi-surface rounded-lg border border-cgi-muted">
                  <div className="text-sm text-cgi-surface-foreground">
                    <strong>{selectedCell.day}</strong> {selectedCell.hour}:00 - {selectedCell.hour + 1}:00
                  </div>
                  <div className="text-lg font-bold text-cgi-primary">
                    {selectedCell.value} beváltás
                  </div>
                </div>
              )}
            </div>
          )}
        </ChartCard>
      </div>
    </PageLayout>
  );
}
