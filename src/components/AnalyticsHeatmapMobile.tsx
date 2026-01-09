import { Card } from '@/components/ui/card';
import { TrendingUp, Clock, Calendar } from 'lucide-react';

interface AnalyticsHeatmapMobileProps {
  heatmapData: number[][];
}

export default function AnalyticsHeatmapMobile({ heatmapData }: AnalyticsHeatmapMobileProps) {
  const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
  
  // Calculate busiest day
  const dayTotals = heatmapData.map((dayData, idx) => ({
    day: days[idx],
    total: dayData.reduce((sum, val) => sum + val, 0)
  }));
  const busiestDay = dayTotals.reduce((max, curr) => curr.total > max.total ? curr : max);
  
  // Calculate busiest hour
  const hourTotals: { hour: number; total: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const total = heatmapData.reduce((sum, dayData) => sum + dayData[h], 0);
    hourTotals.push({ hour: h, total });
  }
  const busiestHour = hourTotals.reduce((max, curr) => curr.total > max.total ? curr : max);
  
  // Total redemptions
  const totalRedemptions = dayTotals.reduce((sum, d) => sum + d.total, 0);
  
  // Weekend vs weekday
  const weekdayTotal = dayTotals.slice(0, 5).reduce((sum, d) => sum + d.total, 0);
  const weekendTotal = dayTotals.slice(5).reduce((sum, d) => sum + d.total, 0);
  
  return (
    <div className="space-y-3">
      <Card className="p-4 cgi-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cgi-primary/10">
            <TrendingUp className="h-5 w-5 text-cgi-primary" />
          </div>
          <div>
            <p className="text-sm text-cgi-muted-foreground">Összes beváltás</p>
            <p className="text-xl font-bold text-cgi-surface-foreground">{totalRedemptions}</p>
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 cgi-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-cgi-primary" />
            <span className="text-sm text-cgi-muted-foreground">Legforgalmasabb nap</span>
          </div>
          <p className="font-semibold text-cgi-surface-foreground">{busiestDay.day}</p>
          <p className="text-xs text-cgi-muted-foreground">{busiestDay.total} beváltás</p>
        </Card>
        
        <Card className="p-4 cgi-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-cgi-primary" />
            <span className="text-sm text-cgi-muted-foreground">Csúcsidőszak</span>
          </div>
          <p className="font-semibold text-cgi-surface-foreground">{busiestHour.hour}:00</p>
          <p className="text-xs text-cgi-muted-foreground">{busiestHour.total} beváltás</p>
        </Card>
      </div>
      
      <Card className="p-4 cgi-card">
        <p className="text-sm text-cgi-muted-foreground mb-2">Hétköznap vs hétvége</p>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-cgi-surface-foreground">Hétköznap</span>
              <span className="text-cgi-muted-foreground">{weekdayTotal}</span>
            </div>
            <div className="h-2 bg-cgi-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-cgi-primary rounded-full"
                style={{ width: `${(weekdayTotal / (weekdayTotal + weekendTotal)) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-cgi-surface-foreground">Hétvége</span>
              <span className="text-cgi-muted-foreground">{weekendTotal}</span>
            </div>
            <div className="h-2 bg-cgi-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-cgi-secondary rounded-full"
                style={{ width: `${(weekendTotal / (weekdayTotal + weekendTotal)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* Day breakdown */}
      <Card className="p-4 cgi-card">
        <p className="text-sm text-cgi-muted-foreground mb-3">Napi bontás</p>
        <div className="space-y-2">
          {dayTotals.map((d, idx) => {
            const pct = busiestDay.total > 0 ? (d.total / busiestDay.total) * 100 : 0;
            return (
              <div key={d.day} className="flex items-center gap-2">
                <span className="text-xs text-cgi-muted-foreground w-12">{d.day.substring(0, 3)}</span>
                <div className="flex-1 h-3 bg-cgi-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${idx >= 5 ? 'bg-cgi-secondary' : 'bg-cgi-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-cgi-surface-foreground w-8 text-right">{d.total}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
