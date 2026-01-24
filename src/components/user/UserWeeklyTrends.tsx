import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from "recharts";
import { chartTooltipStyle, barChartCursor } from "@/lib/chartStyles";

interface WeeklyTrendsData {
  week: string;
  sessions: number;
  redemptions: number;
}

interface UserWeeklyTrendsProps {
  data: WeeklyTrendsData[];
}

export function UserWeeklyTrends({ data }: UserWeeklyTrendsProps) {
  const isEmpty = data.every(d => d.sessions === 0 && d.redemptions === 0);

  const weekLabels: Record<string, string> = {
    "W-3": "3 hete",
    "W-2": "2 hete",
    "W-1": "1 hete",
    "W-0": "E hét"
  };

  const formattedData = data.map(d => ({
    ...d,
    weekLabel: weekLabels[d.week] || d.week
  }));

  return (
    <Card className="cgi-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-cgi-primary" />
          Heti trendek
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[200px] flex items-center justify-center text-cgi-muted-foreground">
            Nincs elegendő adat a megjelenítéshez
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formattedData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--cgi-muted))" opacity={0.3} />
              <XAxis 
                dataKey="weekLabel" 
                stroke="hsl(var(--cgi-muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--cgi-muted-foreground))"
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip
                {...chartTooltipStyle}
                cursor={barChartCursor}
              />
              <Legend 
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => value === "sessions" ? "Munkamenetek" : "Beváltások"}
              />
              <Bar 
                dataKey="sessions" 
                name="sessions"
                fill="hsl(var(--cgi-primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="redemptions" 
                name="redemptions"
                fill="hsl(var(--cgi-secondary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}