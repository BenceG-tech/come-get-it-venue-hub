import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { VenueLink } from "@/components/ui/entity-links";
import { 
  Sparkles, 
  TrendingUp, 
  MapPin, 
  Clock, 
  Bell, 
  ChevronRight,
  Calendar,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionsData {
  expected_redemptions_30_days: {
    min: number;
    max: number;
    average: number;
  };
  estimated_spend_30_days: {
    min: number;
    max: number;
  };
  likely_venues: Array<{
    venue_id: string;
    venue_name: string;
    probability: number;
  }>;
  likely_day: {
    day: number;
    day_name: string;
    probability: number;
  };
  likely_hour: {
    hour: number;
    probability: number;
  };
  optimal_push: {
    day_name: string;
    time: string;
    suggested_message: string;
  } | null;
  confidence: "low" | "medium" | "high";
  data_weeks: number;
}

interface UserPredictionsProps {
  predictions: PredictionsData | null;
  onSendPush?: (message: string) => void;
}

const dayNames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

export function UserPredictions({ predictions, onSendPush }: UserPredictionsProps) {
  if (!predictions) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Jövőbeli Előrejelzés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-cgi-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nincs elegendő adat az előrejelzéshez</p>
            <p className="text-sm mt-1">Legalább 2 hét aktivitás szükséges</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceBadge = () => {
    switch (predictions.confidence) {
      case "high":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Magas megbízhatóság</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Közepes megbízhatóság</Badge>;
      case "low":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Alacsony megbízhatóság</Badge>;
    }
  };

  return (
    <Card className="cgi-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Jövőbeli Előrejelzés (30 nap)
            <InfoTooltip content="A felhasználó korábbi viselkedése alapján becsült értékek a következő 30 napra. A pontosság az elérhető adatok mennyiségétől függ." />
          </CardTitle>
          {getConfidenceBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Prediction Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Expected Redemptions */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-cgi-muted-foreground">Várható beváltások</span>
            </div>
            <p className="text-2xl font-bold text-cgi-surface-foreground">
              {predictions.expected_redemptions_30_days.min}-{predictions.expected_redemptions_30_days.max} db
            </p>
            <p className="text-xs text-cgi-muted-foreground mt-1">
              átlag: {predictions.expected_redemptions_30_days.average} db/hó
            </p>
          </div>

          {/* Estimated Spend */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg p-4 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-cgi-muted-foreground">Becsült költés</span>
            </div>
            <p className="text-2xl font-bold text-cgi-surface-foreground">
              {predictions.estimated_spend_30_days.min.toLocaleString("hu-HU")}-{predictions.estimated_spend_30_days.max.toLocaleString("hu-HU")}
            </p>
            <p className="text-xs text-cgi-muted-foreground mt-1">
              Forint
            </p>
          </div>

          {/* Likely Venue */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-cgi-muted-foreground">Legvalószínűbb helyszín</span>
            </div>
            {predictions.likely_venues.length > 0 ? (
              <>
                <p className="text-lg font-bold text-cgi-surface-foreground truncate">
                  {predictions.likely_venues[0].venue_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-cgi-muted-foreground">
                    {predictions.likely_venues[0].probability}% valószínűség
                  </span>
                </div>
              </>
            ) : (
              <p className="text-cgi-muted-foreground">Nincs adat</p>
            )}
          </div>
        </div>

        {/* Optimal Push Time */}
        {predictions.optimal_push && (
          <div className="bg-cgi-muted/30 rounded-lg p-4 border border-cgi-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-5 w-5 text-cgi-primary" />
              <span className="font-medium text-cgi-surface-foreground">Optimális push időpont</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-cgi-muted-foreground" />
                    <span className="text-cgi-surface-foreground font-medium">{predictions.optimal_push.day_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-cgi-muted-foreground" />
                    <span className="text-cgi-surface-foreground font-medium">{predictions.optimal_push.time}</span>
                  </div>
                </div>
                <p className="text-sm text-cgi-muted-foreground italic">
                  "{predictions.optimal_push.suggested_message}"
                </p>
              </div>
              {onSendPush && (
                <Button
                  onClick={() => onSendPush(predictions.optimal_push!.suggested_message)}
                  className="bg-cgi-primary hover:bg-cgi-primary/90"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Push küldése
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Additional Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Likely Day & Hour */}
          <div className="space-y-2">
            <p className="text-cgi-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Leggyakoribb nap: 
              <span className="text-cgi-surface-foreground font-medium">
                {predictions.likely_day.day_name} ({predictions.likely_day.probability}%)
              </span>
            </p>
            <p className="text-cgi-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Leggyakoribb időpont: 
              <span className="text-cgi-surface-foreground font-medium">
                {predictions.likely_hour.hour}:00 ({predictions.likely_hour.probability}%)
              </span>
            </p>
          </div>

          {/* Other Likely Venues */}
          {predictions.likely_venues.length > 1 && (
            <div className="space-y-2">
              <p className="text-cgi-muted-foreground mb-1">Egyéb valószínű helyszínek:</p>
              {predictions.likely_venues.slice(1).map((venue) => (
                <div key={venue.venue_id} className="flex items-center justify-between">
                  <VenueLink venueId={venue.venue_id} venueName={venue.venue_name} />
                  <span className="text-xs text-cgi-muted-foreground">{venue.probability}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calculation Basis Footer */}
        <div className="pt-4 border-t border-cgi-muted/30">
          <p className="text-xs text-cgi-muted-foreground">
            📊 Számítás alapja: {predictions.data_weeks} hét aktivitási adatok
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
