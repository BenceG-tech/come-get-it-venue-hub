import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wine } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { chartTooltipStyle } from "@/lib/chartStyles";

interface DrinkPreference {
  drink_name: string;
  category: string | null;
  count: number;
}

interface UserDrinkPreferencesProps {
  preferences: DrinkPreference[];
}

const COLORS = [
  "hsl(182, 71%, 42%)",  // cgi-primary
  "hsl(200, 88%, 32%)",  // cgi-secondary  
  "hsl(198, 91%, 30%)",  // cgi-tertiary
  "hsl(142, 76%, 36%)",  // cgi-success
  "hsl(45, 93%, 47%)",   // yellow
];

export function UserDrinkPreferences({ preferences }: UserDrinkPreferencesProps) {
  const isEmpty = preferences.length === 0;

  const chartData = preferences.map((p, i) => ({
    name: p.drink_name,
    value: p.count,
    category: p.category,
    fill: COLORS[i % COLORS.length]
  }));

  const getCategoryLabel = (category: string | null) => {
    const labels: Record<string, string> = {
      beer: "🍺 Sör",
      wine: "🍷 Bor",
      cocktail: "🍸 Koktél",
      spirit: "🥃 Rövidital",
      soft: "🥤 Üdítő"
    };
    return category ? labels[category] || category : "Egyéb";
  };

  return (
    <Card className="cgi-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2 text-lg">
          <Wine className="h-5 w-5 text-cgi-secondary" />
          Kedvenc italok
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[200px] flex items-center justify-center text-cgi-muted-foreground">
            Nincs beváltási adat
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  {...chartTooltipStyle}
                  formatter={(value: number, name: string) => [`${value} db`, name]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {preferences.map((p, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-cgi-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <div>
                      <p className="text-sm font-medium text-cgi-surface-foreground">{p.drink_name}</p>
                      <p className="text-xs text-cgi-muted-foreground">{getCategoryLabel(p.category)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-cgi-secondary">{p.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}