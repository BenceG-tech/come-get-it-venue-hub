import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { Gift, CreditCard, TrendingUp, MapPin, Calendar, CalendarDays, CalendarRange, AlertTriangle } from "lucide-react";
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

  // Helper to render visit badge with warning for impossible values
  const renderVisitBadge = (label: string, count: number, maxPossible: number, Icon: typeof Calendar) => {
    const isImpossible = count > maxPossible;
    
    return (
      <Badge 
        variant="outline" 
        className={`text-cgi-muted-foreground ${isImpossible ? 'border-amber-500/50 bg-amber-500/10' : ''}`}
        title={isImpossible ? `Tesztadat figyelmeztetés: Valós esetben max ${maxPossible} lehetséges` : undefined}
      >
        <Icon className="h-3 w-3 mr-1" />
        {label}: {count}
        {isImpossible && (
          <AlertTriangle className="h-3 w-3 ml-1 text-amber-500" />
        )}
      </Badge>
    );
  };

  return (
    <Card className="cgi-card">
      <CardHeader>
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-cgi-primary" />
          Bevétel hatás
          <InfoTooltip content="A felhasználó által generált bevétel: ingyen italok értéke vs. tényleges költés a helyszíneken (POS adatok alapján)." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-cgi-secondary/10 border border-cgi-secondary/30">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-cgi-secondary/20 flex items-center justify-center">
                <Gift className="h-6 w-6 text-cgi-secondary" />
              </div>
              <div>
                <p className="text-sm text-cgi-muted-foreground">Ingyen italok</p>
                <p className="text-2xl font-bold text-cgi-secondary">{data.total_free_drinks} db</p>
                <p className="text-sm text-cgi-muted-foreground">{formatCurrency(data.total_free_drinks_value)} érték</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-cgi-primary/10 border border-cgi-primary/30">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-cgi-primary/20 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-cgi-primary" />
              </div>
              <div>
                <p className="text-sm text-cgi-muted-foreground">Többletköltés</p>
                <p className="text-2xl font-bold text-cgi-primary">{formatCurrency(data.total_pos_spend)}</p>
                <div className="mt-1">
                  {getRoiBadge(data.overall_roi)}
                  <span className="text-xs text-cgi-muted-foreground ml-2">ROI</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Venue Breakdown */}
        {data.venue_breakdown.length > 0 ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-cgi-muted-foreground flex items-center gap-2">
              Helyszínenkénti bontás
              <InfoTooltip content="Szabály: 1 ingyen ital / nap / helyszín. Ha ennél magasabb számot látsz, az tesztadatból származik." />
            </h4>
            {data.venue_breakdown.map((venue) => (
              <div
                key={venue.venue_id}
                className="p-4 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cgi-primary" />
                    <span className="font-medium text-cgi-surface-foreground">{venue.venue_name}</span>
                  </div>
                  {venue.roi > 0 && getRoiBadge(venue.roi)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-cgi-muted-foreground">🍺 Free drinks:</span>
                    <span className="ml-2 text-cgi-secondary font-medium">
                      {venue.free_drinks_count} db ({formatCurrency(venue.free_drinks_value)})
                    </span>
                  </div>
                  <div>
                    <span className="text-cgi-muted-foreground">💳 Költés:</span>
                    <span className="ml-2 text-cgi-primary font-medium">
                      {formatCurrency(venue.pos_spend)}
                    </span>
                  </div>
                </div>

                {/* Visit Counters with warnings for impossible values */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-cgi-muted/30">
                  {renderVisitBadge("Ma", venue.visits_today, 1, Calendar)}
                  {renderVisitBadge("Heti", venue.visits_this_week, 7, CalendarDays)}
                  {renderVisitBadge("Havi", venue.visits_this_month, 31, CalendarRange)}
                  <Badge className="bg-cgi-primary/20 text-cgi-primary border-cgi-primary/30">
                    Összes: {venue.visits_total}
                  </Badge>
                </div>
              </div>
            ))}
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
