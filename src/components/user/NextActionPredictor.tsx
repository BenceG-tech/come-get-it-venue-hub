import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap,
  MapPin,
  Clock,
  Calendar,
  TrendingUp
} from "lucide-react";

interface Prediction {
  next_venue: { venue_id: string; venue_name: string; probability: number } | null;
  next_day: { day: number; dayName: string; probability: number } | null;
  next_hour: { hour: number; probability: number } | null;
  estimated_next_visit_days: number | null;
  optimal_push_time: string | null;
}

interface NextActionPredictorProps {
  predictions: Prediction;
  className?: string;
}

export function NextActionPredictor({ predictions, className }: NextActionPredictorProps) {
  const hasAnyPrediction = predictions.next_venue || predictions.next_day || predictions.next_hour;

  if (!hasAnyPrediction) {
    return null;
  }

  return (
    <Card className={`cgi-card bg-gradient-to-br from-cgi-secondary/5 to-cgi-primary/5 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground">
          <Zap className="h-5 w-5 text-cgi-primary" />
          Következő akció előrejelzés
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Next Venue */}
          {predictions.next_venue && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-cgi-muted-foreground">
                <MapPin className="h-4 w-4" />
                Következő helyszín
              </div>
              <div className="bg-cgi-surface/50 rounded-lg p-3 border border-cgi-border/50">
                <p className="font-semibold text-cgi-surface-foreground text-lg">
                  {predictions.next_venue.venue_name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress 
                    value={predictions.next_venue.probability} 
                    className="h-2 flex-1"
                  />
                  <Badge 
                    variant={predictions.next_venue.probability >= 70 ? "default" : "secondary"}
                    className={predictions.next_venue.probability >= 70 ? "bg-cgi-success" : ""}
                  >
                    {predictions.next_venue.probability}%
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Next Day/Time */}
          {predictions.next_day && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-cgi-muted-foreground">
                <Calendar className="h-4 w-4" />
                Valószínű időpont
              </div>
              <div className="bg-cgi-surface/50 rounded-lg p-3 border border-cgi-border/50">
                <p className="font-semibold text-cgi-surface-foreground text-lg">
                  {predictions.next_day.dayName}
                  {predictions.next_hour && ` ${predictions.next_hour.hour}:00`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress 
                    value={predictions.next_day.probability} 
                    className="h-2 flex-1"
                  />
                  <Badge variant="secondary">
                    {predictions.next_day.probability}%
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Optimal Push Time */}
          {predictions.optimal_push_time && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-cgi-muted-foreground">
                <Clock className="h-4 w-4" />
                Optimális push időpont
              </div>
              <div className="bg-cgi-primary/10 rounded-lg p-3 border border-cgi-primary/30">
                <p className="font-semibold text-cgi-primary text-lg">
                  {predictions.optimal_push_time}
                </p>
                <p className="text-xs text-cgi-muted-foreground mt-1">
                  Legnagyobb megnyitási esély
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Estimated Next Visit */}
        {predictions.estimated_next_visit_days && (
          <div className="mt-4 pt-4 border-t border-cgi-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cgi-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Becsült következő látogatás</span>
              </div>
              <Badge variant="outline" className="text-cgi-surface-foreground">
                {predictions.estimated_next_visit_days} napon belül
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
