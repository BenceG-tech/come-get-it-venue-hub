import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Brain,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileTooltip } from "@/components/ui/mobile-tooltip";

interface BehaviorPattern {
  id: string;
  name: string;
  nameHu: string;
  icon: string;
  description: string;
  action: string;
  confidence: number;
  evidence: string;
}

interface BehaviorAnalysis {
  patterns: BehaviorPattern[];
  cluster: {
    id: string;
    name: string;
    size: number;
  } | null;
  predictions: {
    next_venue: { venue_id: string; venue_name: string; probability: number } | null;
    next_day: { day: number; dayName: string; probability: number } | null;
    next_hour: { hour: number; probability: number } | null;
    estimated_next_visit_days: number | null;
    optimal_push_time: string | null;
  };
  micro_moments: Array<{
    type: string;
    title: string;
    description: string;
    urgency: "high" | "medium" | "low";
    action: string;
  }>;
}

interface BehaviorPatternBadgesProps {
  userId: string;
}

export function BehaviorPatternBadges({ userId }: BehaviorPatternBadgesProps) {
  const { data, isLoading, error } = useQuery<BehaviorAnalysis>({
    queryKey: ["user-behavior", userId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-user-behavior?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to analyze user behavior");
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1
  });

  if (isLoading) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground">
            <Brain className="h-5 w-5 text-cgi-secondary" />
            Viselkedési minták
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Silent fail - don't show card if analysis failed
  }

  const { patterns, cluster, predictions, micro_moments } = data;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-cgi-muted/20 text-cgi-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Behavior Patterns */}
      <Card className="cgi-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground">
            <Brain className="h-5 w-5 text-cgi-secondary" />
            Viselkedési minták
            {cluster && (
              <Badge variant="outline" className="ml-2 text-xs">
                {cluster.name} klaszter ({cluster.size} fő)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <p className="text-cgi-muted-foreground text-center py-4">
              Nincs még elég adat a viselkedési minták azonosításához
            </p>
          ) : (
            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div 
                  key={pattern.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-cgi-muted/20 border border-cgi-border/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{pattern.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-cgi-surface-foreground">
                          {pattern.nameHu}
                        </span>
                        <MobileTooltip content={
                          <div className="space-y-1">
                            <p>{pattern.description}</p>
                            <p className="text-xs text-cgi-muted-foreground">
                              Ajánlott: {pattern.action}
                            </p>
                          </div>
                        }>
                          <Info className="h-3 w-3 text-cgi-muted-foreground cursor-help" />
                        </MobileTooltip>
                      </div>
                      <p className="text-xs text-cgi-muted-foreground">
                        {pattern.evidence}
                      </p>
                    </div>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={pattern.confidence} 
                        className="h-2 w-16"
                      />
                      <span className="text-sm font-medium text-cgi-secondary">
                        {pattern.confidence}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictions */}
      {(predictions.next_venue || predictions.optimal_push_time) && (
        <Card className="cgi-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground text-base">
              🔮 Előrejelzések
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {predictions.next_venue && (
                <div className="bg-cgi-muted/20 rounded-lg p-3">
                  <p className="text-xs text-cgi-muted-foreground mb-1">Következő helyszín</p>
                  <p className="font-medium text-cgi-surface-foreground">{predictions.next_venue.venue_name}</p>
                  <p className="text-sm text-cgi-secondary">{predictions.next_venue.probability}% valószínűség</p>
                </div>
              )}
              {predictions.next_day && (
                <div className="bg-cgi-muted/20 rounded-lg p-3">
                  <p className="text-xs text-cgi-muted-foreground mb-1">Valószínű nap</p>
                  <p className="font-medium text-cgi-surface-foreground">{predictions.next_day.dayName}</p>
                  <p className="text-sm text-cgi-secondary">{predictions.next_day.probability}% valószínűség</p>
                </div>
              )}
              {predictions.next_hour && (
                <div className="bg-cgi-muted/20 rounded-lg p-3">
                  <p className="text-xs text-cgi-muted-foreground mb-1">Valószínű időpont</p>
                  <p className="font-medium text-cgi-surface-foreground">{predictions.next_hour.hour}:00</p>
                  <p className="text-sm text-cgi-secondary">{predictions.next_hour.probability}% valószínűség</p>
                </div>
              )}
              {predictions.optimal_push_time && (
                <div className="bg-cgi-primary/10 rounded-lg p-3 border border-cgi-primary/30">
                  <p className="text-xs text-cgi-muted-foreground mb-1">🎯 Optimális push időpont</p>
                  <p className="font-medium text-cgi-primary">{predictions.optimal_push_time}</p>
                </div>
              )}
            </div>
            {predictions.estimated_next_visit_days && (
              <p className="text-sm text-cgi-muted-foreground mt-3">
                📅 Becsült következő látogatás: <span className="font-medium text-cgi-surface-foreground">{predictions.estimated_next_visit_days} napon belül</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Micro-moments */}
      {micro_moments.length > 0 && (
        <Card className="cgi-card border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground text-base">
              ⚡ Mikro-pillanatok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {micro_moments.map((moment, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getUrgencyColor(moment.urgency)}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    moment.urgency === "high" ? "bg-red-500" :
                    moment.urgency === "medium" ? "bg-amber-500" : "bg-blue-500"
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium">{moment.title}</p>
                    <p className="text-sm opacity-80">{moment.description}</p>
                    <p className="text-xs mt-1 opacity-60">→ {moment.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
