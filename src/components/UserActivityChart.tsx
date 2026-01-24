import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { chartTooltipStyle } from "@/lib/chartStyles";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface DailyData {
  date: string;
  count: number;
}

interface WeeklyData {
  week_start: string;
  count: number;
}

interface UserActivityChartProps {
  dailyData: DailyData[];
  weeklyData: WeeklyData[];
}

export function UserActivityChart({ dailyData, weeklyData }: UserActivityChartProps) {
  const [range, setRange] = useState<"7" | "14" | "30">("30");

  const filteredDaily = dailyData.slice(-parseInt(range));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
  };

  return (
    <ChartCard
      title="Napi aktív felhasználók"
      tooltip="Egyedi felhasználók száma, akik az adott napon aktívak voltak az alkalmazásban."
      action={
        <Tabs value={range} onValueChange={(v) => setRange(v as "7" | "14" | "30")}>
          <TabsList className="bg-cgi-muted/30 h-8">
            <TabsTrigger value="7" className="text-xs px-2 h-6 data-[state=active]:bg-cgi-primary">
              7 nap
            </TabsTrigger>
            <TabsTrigger value="14" className="text-xs px-2 h-6 data-[state=active]:bg-cgi-primary">
              14 nap
            </TabsTrigger>
            <TabsTrigger value="30" className="text-xs px-2 h-6 data-[state=active]:bg-cgi-primary">
              30 nap
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={filteredDaily}>
          <defs>
            <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1fb1b7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1fb1b7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--cgi-muted))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--cgi-muted-foreground))"
            fontSize={12}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis stroke="hsl(var(--cgi-muted-foreground))" fontSize={12} />
          <Tooltip
            {...chartTooltipStyle}
            cursor={{ stroke: "hsl(var(--cgi-primary))", strokeWidth: 1, strokeDasharray: "3 3" }}
            labelFormatter={formatDate}
            formatter={(value: number) => [`${value} felhasználó`, "Aktív"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#1fb1b7"
            strokeWidth={2}
            fill="url(#dauGradient)"
            name="Aktív felhasználók"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
