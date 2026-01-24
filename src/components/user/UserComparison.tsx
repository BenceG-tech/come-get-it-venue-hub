import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3, Lightbulb } from "lucide-react";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";

interface PlatformAverages {
  avg_redemptions_per_month: number;
  avg_spend_per_redemption: number;
  avg_venues_visited: number;
  avg_roi: number;
}

interface UserComparisonProps {
  userRedemptionsPerMonth: number;
  userSpendPerRedemption: number;
  userVenuesVisited: number;
  userRoi: number;
  platformAvg: PlatformAverages;
}

interface ComparisonMetric {
  label: string;
  userValue: number;
  platformValue: number;
  format: (val: number) => string;
  higherIsBetter: boolean;
}

export function UserComparison({
  userRedemptionsPerMonth,
  userSpendPerRedemption,
  userVenuesVisited,
  userRoi,
  platformAvg
}: UserComparisonProps) {
  const metrics: (ComparisonMetric & { tooltip: string })[] = [
    {
      label: "Beváltások/hó",
      userValue: userRedemptionsPerMonth,
      platformValue: platformAvg.avg_redemptions_per_month,
      format: (val) => `${val.toFixed(1)} db`,
      higherIsBetter: true,
      tooltip: "Havi átlagos beváltások száma. Magasabb = aktívabb felhasználó."
    },
    {
      label: "Költés/beváltás",
      userValue: userSpendPerRedemption,
      platformValue: platformAvg.avg_spend_per_redemption,
      format: (val) => `${val.toLocaleString("hu-HU")} Ft`,
      higherIsBetter: true,
      tooltip: "Átlagos költés minden beváltás után. Magasabb = értékesebb vendég."
    },
    {
      label: "Látogatott helyek",
      userValue: userVenuesVisited,
      platformValue: platformAvg.avg_venues_visited,
      format: (val) => `${val} db`,
      higherIsBetter: true,
      tooltip: "Hány különböző helyszínen volt aktív a platformon."
    },
    {
      label: "ROI",
      userValue: userRoi,
      platformValue: platformAvg.avg_roi,
      format: (val) => `${val.toFixed(1)}x`,
      higherIsBetter: true,
      tooltip: "Megtérülés: a vendég által generált bevétel vs. ingyen italok költsége. 2x+ = nyereséges."
    }
  ];

  const getComparison = (metric: ComparisonMetric) => {
    if (metric.platformValue === 0) return { percent: 0, trend: "equal" as const };
    
    const diff = ((metric.userValue - metric.platformValue) / metric.platformValue) * 100;
    
    if (Math.abs(diff) < 5) {
      return { percent: 0, trend: "equal" as const };
    }
    
    return {
      percent: Math.abs(Math.round(diff)),
      trend: diff > 0 ? "up" as const : "down" as const
    };
  };

  const getTrendIcon = (trend: "up" | "down" | "equal", higherIsBetter: boolean) => {
    if (trend === "equal") return <Minus className="h-4 w-4" />;
    if (trend === "up") return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = (trend: "up" | "down" | "equal", higherIsBetter: boolean) => {
    if (trend === "equal") return "text-cgi-muted-foreground";
    if ((trend === "up" && higherIsBetter) || (trend === "down" && !higherIsBetter)) {
      return "text-cgi-success";
    }
    return "text-cgi-error";
  };

  // Generate insight based on metrics
  const generateInsight = () => {
    const aboveAverage = metrics.filter(m => {
      const comparison = getComparison(m);
      return comparison.trend === "up";
    });
    const belowAverage = metrics.filter(m => {
      const comparison = getComparison(m);
      return comparison.trend === "down";
    });

    if (aboveAverage.length >= 3) {
      return {
        type: "positive" as const,
        text: "Kiemelkedően aktív felhasználó a platform átlagához képest."
      };
    } else if (belowAverage.length >= 3) {
      return {
        type: "warning" as const,
        text: "Az aktivitás és költés javítása ajánlott célzott kampányokkal."
      };
    } else if (userRoi < platformAvg.avg_roi && userRedemptionsPerMonth > platformAvg.avg_redemptions_per_month) {
      return {
        type: "insight" as const,
        text: "Aktív felhasználó alacsonyabb ROI-val. Javaslat: Premium ajánlatokkal ösztönözni a magasabb költést."
      };
    }
    return {
      type: "neutral" as const,
      text: "A felhasználó az átlagos szinten teljesít a platformon."
    };
  };

  const insight = generateInsight();

  return (
    <Card className="cgi-card">
      <CardHeader>
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cgi-primary" />
          Összehasonlítás a platform átlaggal
          <InfoTooltip content="Összehasonlítja a felhasználó metrikáit a teljes platform átlagával. Segít azonosítani a kiemelkedő vagy javítandó területeket." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => {
            const comparison = getComparison(metric);
            const trendColor = getTrendColor(comparison.trend, metric.higherIsBetter);
            
            return (
              <div key={metric.label} className="flex items-center justify-between p-3 rounded-lg bg-cgi-muted/20">
                <div className="flex-1">
                  <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                    {metric.label}
                    <InfoTooltip content={metric.tooltip} />
                  </p>
                  <p className="text-lg font-semibold text-cgi-surface-foreground">
                    {metric.format(metric.userValue)}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1 ${trendColor}`}>
                    {getTrendIcon(comparison.trend, metric.higherIsBetter)}
                    {comparison.percent > 0 && (
                      <span className="text-sm font-medium">
                        {comparison.trend === "up" ? "+" : "-"}{comparison.percent}%
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-cgi-muted-foreground">vs átlag</p>
                    <p className="text-sm text-cgi-muted-foreground">
                      ({metric.format(metric.platformValue)})
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Insight section */}
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
            insight.type === "positive" ? "bg-cgi-success/10 border border-cgi-success/30" :
            insight.type === "warning" ? "bg-cgi-warning/10 border border-cgi-warning/30" :
            "bg-cgi-primary/10 border border-cgi-primary/30"
          }`}>
            <Lightbulb className={`h-5 w-5 mt-0.5 ${
              insight.type === "positive" ? "text-cgi-success" :
              insight.type === "warning" ? "text-cgi-warning" :
              "text-cgi-primary"
            }`} />
            <div>
              <p className="text-sm font-medium text-cgi-surface-foreground">Értékelés</p>
              <p className="text-sm text-cgi-muted-foreground mt-1">{insight.text}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
