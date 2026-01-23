import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { VenueLink } from "@/components/ui/entity-links";
import { Calendar, Wine, CreditCard, TrendingUp, MapPin, Zap, Trophy } from "lucide-react";

interface QuickOverviewCardProps {
  daysSinceRegistration: number;
  totalRedemptions: number;
  totalSpend: number;
  roi: number;
  favoriteVenue: { venue_id: string; venue_name: string } | null;
  todayStats: {
    redemptions: number;
    venues: string[];
  };
  activeVenuesCount: number;
  weeklyVipVenue?: string | null;
}

export function QuickOverviewCard({
  daysSinceRegistration,
  totalRedemptions,
  totalSpend,
  roi,
  favoriteVenue,
  todayStats,
  activeVenuesCount,
  weeklyVipVenue
}: QuickOverviewCardProps) {
  const formatCurrency = (value: number) => value.toLocaleString("hu-HU");

  return (
    <Card className="cgi-card overflow-hidden">
      <CardContent className="p-4">
        {/* Top row - Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {/* Days as member */}
          <div className="p-3 rounded-lg bg-cgi-muted/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-4 w-4 text-cgi-muted-foreground" />
              <InfoTooltip content="Hány napja regisztrált a felhasználó" />
            </div>
            <p className="text-2xl font-bold text-cgi-surface-foreground">{daysSinceRegistration}</p>
            <p className="text-xs text-cgi-muted-foreground">nap óta tag</p>
          </div>

          {/* Total Redemptions */}
          <div className="p-3 rounded-lg bg-cgi-secondary/10 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wine className="h-4 w-4 text-cgi-secondary" />
              <InfoTooltip content="Összes ingyen ital beváltás" />
            </div>
            <p className="text-2xl font-bold text-cgi-secondary">{totalRedemptions}</p>
            <p className="text-xs text-cgi-muted-foreground">beváltás</p>
          </div>

          {/* Total Spend */}
          <div className="p-3 rounded-lg bg-cgi-primary/10 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CreditCard className="h-4 w-4 text-cgi-primary" />
              <InfoTooltip content="Összes költés a helyszíneken (POS adatok)" />
            </div>
            <p className="text-2xl font-bold text-cgi-primary">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-cgi-muted-foreground">Ft költés</p>
          </div>

          {/* ROI */}
          <div className="p-3 rounded-lg bg-cgi-success/10 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-cgi-success" />
              <InfoTooltip content="ROI = Tényleges költés / Ingyen italok értéke. 2.0x+ = nyereséges ügyfél." />
            </div>
            <p className="text-2xl font-bold text-cgi-success">{roi.toFixed(1)}x</p>
            <p className="text-xs text-cgi-muted-foreground">ROI</p>
          </div>

          {/* Favorite Venue */}
          <div className="p-3 rounded-lg bg-cgi-muted/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-4 w-4 text-cgi-muted-foreground" />
              <InfoTooltip content="A legtöbbször látogatott helyszín" />
            </div>
            {favoriteVenue ? (
              <>
                <div className="flex justify-center">
                  <VenueLink 
                    venueId={favoriteVenue.venue_id} 
                    venueName={favoriteVenue.venue_name}
                    size="sm"
                    showIcon={false}
                    showTooltip={false}
                    className="text-lg font-bold truncate max-w-full"
                  />
                </div>
                <p className="text-xs text-cgi-muted-foreground">kedvenc</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-cgi-muted-foreground">-</p>
                <p className="text-xs text-cgi-muted-foreground">nincs még</p>
              </>
            )}
          </div>
        </div>

        {/* Bottom row - Today's activity & badges */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-cgi-muted/30">
          {/* Today's activity */}
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-cgi-muted-foreground">MA:</span>
            {todayStats.redemptions > 0 ? (
              <span className="text-cgi-surface-foreground">
                {todayStats.redemptions} beváltás
                {todayStats.venues.length > 0 && (
                  <span className="text-cgi-muted-foreground">
                    {" "}({todayStats.venues.slice(0, 2).join(", ")}{todayStats.venues.length > 2 ? "..." : ""})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-cgi-muted-foreground">Nincs aktivitás</span>
            )}
          </div>

          <span className="text-cgi-muted/50">|</span>

          {/* Active venues */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-cgi-primary" />
            <span className="text-cgi-surface-foreground">
              {activeVenuesCount} helyszínen aktív
            </span>
          </div>

          {/* Weekly VIP badge */}
          {weeklyVipVenue && (
            <>
              <span className="text-cgi-muted/50">|</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                <Trophy className="h-3 w-3" />
                Heti VIP @ {weeklyVipVenue}
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
