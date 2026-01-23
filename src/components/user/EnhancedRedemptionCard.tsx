import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wine, CreditCard, MapPin, Clock, Calendar, CalendarDays, TrendingUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

interface FreeDrinkRedemption {
  id: string;
  venue_name: string;
  venue_id: string;
  drink: string;
  value: number;
  redeemed_at: string;
}

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

interface EnhancedRedemptionCardProps {
  redemptions: FreeDrinkRedemption[];
  venueStats?: VenueRevenue[];
}

export function EnhancedRedemptionCard({ redemptions, venueStats }: EnhancedRedemptionCardProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("hu-HU") + " Ft";
  };

  const getVenueStats = (venueId: string): VenueRevenue | undefined => {
    return venueStats?.find((v) => v.venue_id === venueId);
  };

  const getRoiBadge = (roi: number) => {
    if (roi >= 3) return <Badge className="bg-cgi-success/20 text-cgi-success border-cgi-success/30 text-xs">{roi.toFixed(1)}x 🔥</Badge>;
    if (roi >= 2) return <Badge className="bg-cgi-secondary/20 text-cgi-secondary border-cgi-secondary/30 text-xs">{roi.toFixed(1)}x</Badge>;
    if (roi >= 1) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">{roi.toFixed(1)}x</Badge>;
    return null;
  };

  if (redemptions.length === 0) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
            <Wine className="h-5 w-5 text-cgi-secondary" />
            Beváltások
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-cgi-muted-foreground">Nincs beváltás</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cgi-card">
      <CardHeader>
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
          <Wine className="h-5 w-5 text-cgi-secondary" />
          Beváltások ({redemptions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {redemptions.map((redemption, index) => {
            const stats = getVenueStats(redemption.venue_id);
            
            return (
              <div
                key={redemption.id}
                className="p-4 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍺</span>
                    <div>
                      <p className="font-medium text-cgi-surface-foreground">{redemption.drink}</p>
                      <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {redemption.venue_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-cgi-secondary font-medium">{formatCurrency(redemption.value)}</p>
                    <p className="text-xs text-cgi-muted-foreground">
                      {format(new Date(redemption.redeemed_at), "MM.dd HH:mm", { locale: hu })}
                    </p>
                  </div>
                </div>

                {/* Context & Stats */}
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-cgi-muted/30">
                    {/* Visit Context */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-cgi-muted-foreground">Látogatási kontextus</p>
                      <div className="flex flex-wrap gap-1">
                        {stats.visits_this_week > 1 && (
                          <Badge variant="outline" className="text-xs text-cgi-muted-foreground">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            {stats.visits_this_week}. ezen a héten
                          </Badge>
                        )}
                        {stats.visits_this_month > 1 && (
                          <Badge variant="outline" className="text-xs text-cgi-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {stats.visits_this_month}. ebben a hónapban
                          </Badge>
                        )}
                        <Badge className="text-xs bg-cgi-primary/20 text-cgi-primary border-cgi-primary/30">
                          {stats.visits_total}. összesen
                        </Badge>
                      </div>
                    </div>

                    {/* POS Spend */}
                    {stats.pos_spend > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-cgi-muted-foreground">Kapcsolódó költés</p>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-cgi-primary" />
                          <span className="font-medium text-cgi-primary">
                            {formatCurrency(stats.pos_spend)}
                          </span>
                          {stats.roi > 0 && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-cgi-success" />
                              {getRoiBadge(stats.roi)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Milestone Badges */}
                {stats && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {stats.visits_total === 1 && (
                      <Badge className="bg-cgi-secondary/20 text-cgi-secondary border-cgi-secondary/30 text-xs">
                        👋 Első látogatás!
                      </Badge>
                    )}
                    {stats.visits_total === 3 && (
                      <Badge className="bg-cgi-primary/20 text-cgi-primary border-cgi-primary/30 text-xs">
                        🔄 Visszatérő vendég
                      </Badge>
                    )}
                    {stats.visits_this_week >= 3 && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        🔥 Heti törzsvendég
                      </Badge>
                    )}
                    {stats.visits_this_month >= 10 && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                        ⭐ Havi VIP
                      </Badge>
                    )}
                    {stats.visits_total >= 50 && (
                      <Badge className="bg-cgi-success/20 text-cgi-success border-cgi-success/30 text-xs">
                        💎 Platina tag
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
