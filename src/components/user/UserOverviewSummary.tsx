import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { 
  Calendar, 
  Wine, 
  CreditCard, 
  TrendingUp, 
  MapPin, 
  Clock,
  Sparkles
} from "lucide-react";

interface UserOverviewSummaryProps {
  daysSinceRegistration: number;
  totalRedemptions: number;
  totalSpend: number;
  roi: number;
  favoriteVenue: { venue_id: string; venue_name: string; visit_count?: number } | null;
  favoriteDrink: { drink_name: string; category: string | null } | null;
  engagementScore: number;
  churnRisk: "low" | "medium" | "high";
  ltv: number;
  likelyDay?: string | null;
  likelyHour?: number | null;
}

export function UserOverviewSummary({
  daysSinceRegistration,
  totalRedemptions,
  totalSpend,
  roi,
  favoriteVenue,
  favoriteDrink,
  engagementScore,
  churnRisk,
  ltv,
  likelyDay,
  likelyHour
}: UserOverviewSummaryProps) {
  const formatCurrency = (value: number) => value.toLocaleString("hu-HU");
  
  const getChurnBadge = () => {
    switch (churnRisk) {
      case "low":
        return <Badge className="bg-cgi-success/20 text-cgi-success border-cgi-success/30">Alacsony ✓</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Közepes</Badge>;
      case "high":
        return <Badge className="bg-cgi-error/20 text-cgi-error border-cgi-error/30">Magas ⚠</Badge>;
    }
  };

  return (
    <Card className="cgi-card">
      <CardContent className="pt-6">
        {/* Top KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Days as member */}
          <div className="p-3 rounded-lg bg-cgi-muted/20 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-cgi-muted-foreground" />
            <p className="text-2xl font-bold text-cgi-surface-foreground">{daysSinceRegistration}</p>
            <p className="text-xs text-cgi-muted-foreground">napja tag</p>
          </div>

          {/* Total Redemptions */}
          <div className="p-3 rounded-lg bg-cgi-secondary/10 text-center">
            <Wine className="h-5 w-5 mx-auto mb-1 text-cgi-secondary" />
            <p className="text-2xl font-bold text-cgi-secondary">{totalRedemptions}</p>
            <p className="text-xs text-cgi-muted-foreground">beváltás</p>
          </div>

          {/* Total Spend */}
          <div className="p-3 rounded-lg bg-cgi-primary/10 text-center">
            <CreditCard className="h-5 w-5 mx-auto mb-1 text-cgi-primary" />
            <p className="text-2xl font-bold text-cgi-primary">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-cgi-muted-foreground">Ft költés</p>
          </div>

          {/* ROI */}
          <div className="p-3 rounded-lg bg-cgi-success/10 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-cgi-success" />
            <p className="text-2xl font-bold text-cgi-success">{roi > 0 ? roi.toFixed(1) : "0"}x</p>
            <p className="text-xs text-cgi-muted-foreground">ROI</p>
          </div>
        </div>

        {/* Key Characteristics Row */}
        <div className="p-3 rounded-lg bg-cgi-surface/50 border border-cgi-muted/30 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-cgi-secondary" />
            <span className="text-sm font-medium text-cgi-surface-foreground">Főbb jellemzők</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {favoriteVenue && (
              <span className="flex items-center gap-1 text-cgi-muted-foreground">
                <MapPin className="h-3 w-3" />
                Kedvenc: <span className="text-cgi-surface-foreground font-medium">{favoriteVenue.venue_name}</span>
                {favoriteVenue.visit_count && <span>({favoriteVenue.visit_count}×)</span>}
              </span>
            )}
            {favoriteDrink && (
              <span className="flex items-center gap-1 text-cgi-muted-foreground">
                🍺 <span className="text-cgi-surface-foreground font-medium">{favoriteDrink.drink_name}</span>
              </span>
            )}
            {likelyDay && likelyHour !== null && likelyHour !== undefined && (
              <span className="flex items-center gap-1 text-cgi-muted-foreground">
                <Clock className="h-3 w-3" />
                Tipikus: <span className="text-cgi-surface-foreground font-medium">{likelyDay} {likelyHour}:00</span>
              </span>
            )}
          </div>
        </div>

        {/* Scores Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cgi-muted-foreground">Engagement:</span>
            <Badge className="bg-cgi-primary/20 text-cgi-primary border-cgi-primary/30">
              {engagementScore}
            </Badge>
            <InfoTooltip content="Engagement Score: 0-100 skálán méri a felhasználó aktivitását (app nyitások, beváltások, helyszín látogatások alapján)." />
          </div>

          <span className="text-cgi-muted/50">|</span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-cgi-muted-foreground">Churn:</span>
            {getChurnBadge()}
            <InfoTooltip content="Lemorzsolódási kockázat: Alacsony = aktív felhasználó, Közepes = figyelemre méltó, Magas = beavatkozás szükséges." />
          </div>

          <span className="text-cgi-muted/50">|</span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-cgi-muted-foreground">LTV:</span>
            <Badge className="bg-cgi-success/20 text-cgi-success border-cgi-success/30">
              {formatCurrency(ltv)} Ft
            </Badge>
            <InfoTooltip content="Lifetime Value: A felhasználó becsült teljes értéke a platform számára az eddigi és várható jövőbeli aktivitás alapján." />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}