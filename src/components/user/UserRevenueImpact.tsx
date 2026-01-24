import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { Gift, CreditCard, TrendingUp, MapPin, Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VenueRevenue {
  venue_id: string;
  venue_name: string;
  free_drinks_count: number;
  free_drinks_value: number;
  pos_spend: number;
  roi: number;
  visits_today: number;
  visits_this_week: number;
  visits_this_month: number;
  visits_total: number;
}

interface RevenueImpact {
  total_free_drinks: number;
  total_free_drinks_value: number;
  total_pos_spend: number;
  overall_roi: number;
  venue_breakdown: VenueRevenue[];
}

interface UserRevenueImpactProps {
  userId: string;
}

export function UserRevenueImpact({ userId }: UserRevenueImpactProps) {
  const { data, isLoading, error } = useQuery<RevenueImpact>({
    queryKey: ["user-revenue-impact", userId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-revenue-impact?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch revenue impact");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="cgi-card">
        <CardContent className="py-8 text-center text-cgi-muted-foreground">
          Nem sikerült betölteni a bevétel adatokat
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("hu-HU") + " Ft";
  };

  const getRoiBadge = (roi: number) => {
    if (roi >= 3) return <Badge className="bg-cgi-success/20 text-cgi-success border-cgi-success/30">+{roi.toFixed(1)}x 🔥</Badge>;
    if (roi >= 2) return <Badge className="bg-cgi-secondary/20 text-cgi-secondary border-cgi-secondary/30">+{roi.toFixed(1)}x</Badge>;
    if (roi >= 1) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">+{roi.toFixed(1)}x</Badge>;
    return <Badge className="bg-cgi-muted text-cgi-muted-foreground">{roi.toFixed(1)}x</Badge>;
  };

  // Calculate max spend for progress bar scaling
  const maxSpend = Math.max(
    ...data.venue_breakdown.map(v => Math.max(v.free_drinks_value, v.pos_spend)),
    data.total_pos_spend,
    data.total_free_drinks_value
  ) || 1;

  return (
    <Card className="cgi-card">
      <CardHeader>
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-cgi-primary" />
          Bevétel hatás
          <InfoTooltip content="A felhasználó által generált bevétel: ingyen italok értéke vs. tényleges költés a helyszíneken (POS adatok alapján). ROI = Költés ÷ Ingyen italok értéke." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-cgi-secondary/10 border border-cgi-secondary/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cgi-secondary/20 flex items-center justify-center">
                <Gift className="h-5 w-5 text-cgi-secondary" />
              </div>
              <div>
                <p className="text-xs text-cgi-muted-foreground flex items-center gap-1">
                  Ingyen italok
                  <InfoTooltip content="A vendég által kapott ingyen italok száma és becsült értéke (1 ital ≈ 1,500 Ft)." />
                </p>
                <p className="text-xl font-bold text-cgi-secondary">{data.total_free_drinks} db</p>
                <p className="text-xs text-cgi-muted-foreground">{formatCurrency(data.total_free_drinks_value)}</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-cgi-primary/10 border border-cgi-primary/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cgi-primary/20 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-cgi-primary" />
              </div>
              <div>
                <p className="text-xs text-cgi-muted-foreground flex items-center gap-1">
                  Többletköltés
                  <InfoTooltip content="A vendég által a helyszíneken elköltött összeg (POS/banki adatból számítva)." />
                </p>
                <p className="text-xl font-bold text-cgi-primary">{formatCurrency(data.total_pos_spend)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getRoiBadge(data.overall_roi)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-cgi-success/10 border border-cgi-success/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cgi-success/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-cgi-success" />
              </div>
              <div>
                <p className="text-xs text-cgi-muted-foreground flex items-center gap-1">
                  Tiszta profit
                  <InfoTooltip content="Többletköltés - Ingyen italok értéke = A helyszínek profitja ebből a vendégből." />
                </p>
                <p className="text-xl font-bold text-cgi-success">
                  {data.total_pos_spend - data.total_free_drinks_value >= 0 ? "+" : ""}
                  {formatCurrency(data.total_pos_spend - data.total_free_drinks_value)}
                </p>
                <p className="text-xs text-cgi-muted-foreground">
                  {data.overall_roi >= 2 ? "Nyereséges vendég ✓" : data.overall_roi >= 1 ? "Break-even" : "Fejlesztendő"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Venue Breakdown with Progress Bars */}
        {data.venue_breakdown.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-cgi-muted-foreground flex items-center gap-2">
              Helyszínenkénti bontás
              <InfoTooltip content="Részletes ROI bontás helyszínenként. A vizuális sávok az értékeket egymáshoz viszonyítva mutatják." />
            </h4>
            {data.venue_breakdown.map((venue) => {
              const profit = venue.pos_spend - venue.free_drinks_value;
              const freeDrinkPercent = Math.min((venue.free_drinks_value / maxSpend) * 100, 100);
              const spendPercent = Math.min((venue.pos_spend / maxSpend) * 100, 100);
              
              return (
                <div
                  key={venue.venue_id}
                  className="p-4 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30"
                >
                  {/* Header: Venue name + ROI badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cgi-primary" />
                      <span className="font-medium text-cgi-surface-foreground">{venue.venue_name}</span>
                    </div>
                    {venue.roi > 0 && getRoiBadge(venue.roi)}
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-3">
                    {/* Free drinks bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-cgi-muted-foreground flex items-center gap-1">
                          🍺 Ingyen italok értéke
                          <InfoTooltip content="Az ingyen kapott italok becsült értéke (1 ital ≈ 1,500 Ft)." />
                        </span>
                        <span className="text-sm font-medium text-cgi-secondary">
                          {formatCurrency(venue.free_drinks_value)} ({venue.free_drinks_count} db)
                        </span>
                      </div>
                      <div className="h-2 bg-cgi-muted/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cgi-secondary/60 rounded-full transition-all duration-300"
                          style={{ width: `${freeDrinkPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Spend bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-cgi-muted-foreground flex items-center gap-1">
                          💳 Többletköltés
                          <InfoTooltip content="A vendég által ezen a helyszínen elköltött összeg (POS/banki adatból)." />
                        </span>
                        <span className="text-sm font-medium text-cgi-primary">
                          {formatCurrency(venue.pos_spend)}
                        </span>
                      </div>
                      <div className="h-2 bg-cgi-muted/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cgi-primary/60 rounded-full transition-all duration-300"
                          style={{ width: `${spendPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profit line */}
                  <div className="mt-3 pt-3 border-t border-cgi-muted/30 flex items-center justify-between">
                    <span className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                      ✨ Eredmény:
                      <InfoTooltip content="Tiszta profit = Költés - Ingyen italok értéke. Pozitív = nyereséges vendég." />
                    </span>
                    <span className={`text-sm font-bold ${profit >= 0 ? 'text-cgi-success' : 'text-cgi-error'}`}>
                      {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                    </span>
                  </div>

                  {/* Visits - simplified single line */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-cgi-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {venue.visits_total} látogatás összesen
                      {venue.visits_this_week > 0 && ` (${venue.visits_this_week} ezen a héten)`}
                    </span>
                    <InfoTooltip content="Látogatások száma: összes a regisztráció óta és az aktuális heti érték." />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-cgi-muted-foreground">
            Nincs még bevétel adat
          </div>
        )}
      </CardContent>
    </Card>
  );
}