import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";

interface RedemptionData {
  date: string;
  count: number;
  unique_users: number;
}

interface RedemptionTrendsChartProps {
  data: RedemptionData[];
}

export function RedemptionTrendsChart({ data }: RedemptionTrendsChartProps) {
  const last14Days = data.slice(-14);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
  };

  return (
    <ChartCard
      title="Beváltási trendek"
      tooltip="Napi beváltások száma és az egyedi felhasználók, akik beváltottak. Az elmúlt 14 nap adatai."
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={last14Days} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--cgi-muted))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--cgi-muted-foreground))"
            fontSize={12}
            tickFormatter={formatDate}
            interval={1}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="hsl(var(--cgi-muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--cgi-surface))",
              border: "1px solid hsl(var(--cgi-muted))",
              borderRadius: "8px",
              color: "hsl(var(--cgi-surface-foreground))",
            }}
            labelFormatter={formatDate}
            formatter={(value: number, name: string) => [
              value,
              name === "count" ? "Beváltások" : "Egyedi felhasználók",
            ]}
          />
          <Legend
            formatter={(value) =>
              value === "count" ? "Beváltások" : "Egyedi felhasználók"
            }
          />
          <Bar dataKey="count" fill="#1fb1b7" radius={[4, 4, 0, 0]} />
          <Bar dataKey="unique_users" fill="#06b6d4" radius={[4, 4, 0, 0]} opacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
