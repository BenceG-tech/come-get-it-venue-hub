import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { VenueLink } from "@/components/ui/entity-links";
import { MobileTooltip, InfoTooltip } from "@/components/ui/mobile-tooltip";
import { TodayRedemptionStatus } from "./TodayRedemptionStatus";

interface VenueAffinityData {
  venue_id: string;
  venue_name: string;
  visit_count: number;
  first_visit: string | null;
  last_visit: string | null;
  preferred_days: number[];
  preferred_hours: number[];
  today_redemption?: {
    redeemed: boolean;
    redeemed_at?: string;
    drink_name?: string;
  } | null;
  next_window?: { start: string; end: string } | null;
}

interface UserVenueAffinityProps {
  venues: VenueAffinityData[];
}

const dayNames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

export function UserVenueAffinity({ venues }: UserVenueAffinityProps) {
  const getMedalEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  const getVisitTrend = (venue: VenueAffinityData) => {
    if (!venue.last_visit) return null;
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(venue.last_visit).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastVisit < 7) {
      return { icon: TrendingUp, label: "Aktív", color: "text-cgi-success" };
    } else if (daysSinceLastVisit < 30) {
      return { icon: Minus, label: "Stabil", color: "text-cgi-muted-foreground" };
    } else {
      return { icon: TrendingDown, label: "Csökkenő", color: "text-cgi-error" };
    }
  };

  const formatPreferredTime = (hours: number[]) => {
    if (hours.length === 0) return "N/A";
    const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
    return `~${avgHour}:00`;
  };

  const formatPreferredDays = (days: number[]) => {
    if (days.length === 0) return "N/A";
    return days.map(d => dayNames[d]?.slice(0, 2)).join(", ");
  };

  return (
    <Card className="cgi-card">
      <CardHeader>
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-cgi-primary" />
          Helyszín affinitás
          <InfoTooltip content="A felhasználó kedvenc helyszínei látogatás szám alapján rangsorolva. Látható a mai beváltási státusz is - egy felhasználó naponta 1 ingyen italt válthat be helyszínenként." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {venues.length === 0 ? (
          <div className="text-center py-8 text-cgi-muted-foreground">
            Nincs látogatott helyszín
          </div>
        ) : (
          <div className="space-y-4">
            {venues.map((venue, index) => {
              const trend = getVisitTrend(venue);
              
              return (
                <div
                  key={venue.venue_id}
                  className="p-4 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <MobileTooltip content={`${index + 1}. legnépszerűbb helyszín`}>
                        <span className="text-2xl">{getMedalEmoji(index)}</span>
                      </MobileTooltip>
                      <div>
                        <VenueLink
                          venueId={venue.venue_id}
                          venueName={venue.venue_name}
                          size="md"
                          className="font-medium"
                        />
                        {venue.first_visit && (
                          <p className="text-xs text-cgi-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            Első látogatás: {format(new Date(venue.first_visit), "yyyy. MMM d.", { locale: hu })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-cgi-secondary">{venue.visit_count}</p>
                      <p className="text-xs text-cgi-muted-foreground">beváltás</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {trend && (
                      <MobileTooltip content={`Aktivitás trend: ${trend.label.toLowerCase()} az utolsó látogatás alapján`}>
                        <Badge className={`${trend.color} bg-transparent border border-current/30`}>
                          <trend.icon className="h-3 w-3 mr-1" />
                          {trend.label}
                        </Badge>
                      </MobileTooltip>
                    )}
                    {venue.preferred_days.length > 0 && (
                      <Badge variant="outline" className="text-cgi-muted-foreground">
                        📅 {formatPreferredDays(venue.preferred_days)}
                      </Badge>
                    )}
                    {venue.preferred_hours.length > 0 && (
                      <Badge variant="outline" className="text-cgi-muted-foreground">
                        🕐 {formatPreferredTime(venue.preferred_hours)}
                      </Badge>
                    )}
                    {venue.last_visit && (
                      <Badge variant="outline" className="text-cgi-muted-foreground">
                        Utoljára: {formatDistanceToNow(new Date(venue.last_visit), { addSuffix: true, locale: hu })}
                      </Badge>
                    )}
                  </div>

                  {/* Today's Redemption Status */}
                  {venue.today_redemption && (
                    <div className="mt-3">
                      <TodayRedemptionStatus
                        data={{
                          redeemed: venue.today_redemption.redeemed,
                          redeemed_at: venue.today_redemption.redeemed_at,
                          drink_name: venue.today_redemption.drink_name,
                          next_window: venue.next_window
                        }}
                        venueName={venue.venue_name}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
