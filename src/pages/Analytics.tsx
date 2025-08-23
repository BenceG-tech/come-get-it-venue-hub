
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
import { Sidebar } from "@/components/Sidebar";
import { ChartCard } from "@/components/ChartCard";
import { mockAnalyticsData } from "@/lib/mockData";

const COLORS = ['#06b6d4', '#10b981'];

export default function Analytics() {
  const { redemption_timeseries, user_activity, hourly_heatmap } = mockAnalyticsData;
  
  const pieData = [
    { name: 'Új felhasználók', value: user_activity.new_users },
    { name: 'Visszatérő felhasználók', value: user_activity.returning_users }
  ];

  const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  const getHeatmapColor = (value: number) => {
    const max = Math.max(...hourly_heatmap.flat());
    const intensity = value / max;
    return `rgba(6, 182, 212, ${intensity})`;
  };

  return (
    <div className="cgi-page flex">
      <Sidebar />
      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="cgi-container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Analitika</h1>
            <p className="text-cgi-muted-foreground">
              Részletes jelentések és elemzések a helyszín teljesítményéről
            </p>
          </div>

          {/* Redemption Timeseries */}
          <ChartCard title="Italbeváltások idősor" className="mb-8">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={redemption_timeseries.current_week}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f1f1f', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="redemptions" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  name="Aktuális hét"
                  dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="redemptions" 
                  data={redemption_timeseries.previous_week}
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Előző hét"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* User Activity Pie Chart */}
            <ChartCard title="Felhasználói aktivitás">
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
                      backgroundColor: '#1f1f1f', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
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
            </ChartCard>

            {/* Hourly Heatmap */}
            <ChartCard title="Óránkénti csúcsok hőtérképe">
              <div className="space-y-2">
                <div className="grid grid-cols-25 gap-px text-xs">
                  <div></div>
                  {hours.filter((_, i) => i % 2 === 0).map((hour) => (
                    <div key={hour} className="text-center text-cgi-muted-foreground text-[10px]">
                      {hour.split(':')[0]}
                    </div>
                  ))}
                </div>
                {days.map((day, dayIndex) => (
                  <div key={day} className="grid grid-cols-25 gap-px items-center">
                    <div className="text-xs text-cgi-muted-foreground w-12 text-right pr-2">
                      {day.substring(0, 3)}
                    </div>
                    {hourly_heatmap[dayIndex].map((value, hourIndex) => (
                      <div
                        key={`${dayIndex}-${hourIndex}`}
                        className="h-3 w-3 rounded-sm border border-cgi-muted/20"
                        style={{ backgroundColor: getHeatmapColor(value) }}
                        title={`${day} ${hours[hourIndex]}: ${value} beváltás`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-cgi-muted-foreground">
                <span>Kevesebb</span>
                <div className="flex gap-1">
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                    <div
                      key={intensity}
                      className="h-3 w-3 rounded-sm border border-cgi-muted/20"
                      style={{ backgroundColor: `rgba(6, 182, 212, ${intensity})` }}
                    />
                  ))}
                </div>
                <span>Több</span>
              </div>
            </ChartCard>
          </div>
        </div>
      </main>
    </div>
  );
}
