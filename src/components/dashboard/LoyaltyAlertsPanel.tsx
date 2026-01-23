import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Gift, 
  User, 
  X, 
  MapPin, 
  TrendingUp,
  Coins,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SendLoyaltyRewardModal } from "./SendLoyaltyRewardModal";
import { useNavigate } from "react-router-dom";
import { UserLink, VenueLink } from "@/components/ui/entity-links";
import { MobileTooltip, InfoTooltip } from "@/components/ui/mobile-tooltip";

interface PendingMilestone {
  id: string;
  user_id: string;
  venue_id: string;
  milestone_type: string;
  achieved_at: string;
  visit_count: number;
  total_spend: number;
  user_name: string;
  venue_name: string;
  milestone_label: string;
  milestone_emoji: string;
  suggested_reward: string;
}

interface LoyaltyAlertsData {
  pending_milestones: PendingMilestone[];
  summary: {
    pending_count: number;
    today_total: number;
    by_type: Record<string, number>;
  };
}

export function LoyaltyAlertsPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMilestone, setSelectedMilestone] = useState<PendingMilestone | null>(null);

  const { data, isLoading, error } = useQuery<LoyaltyAlertsData>({
    queryKey: ["pending-loyalty-alerts"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-pending-loyalty-alerts`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch loyalty alerts");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const dismissMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-loyalty-reward`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            milestone_id: milestoneId,
            dismiss_only: true,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to dismiss milestone");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Értesítés elutasítva");
      queryClient.invalidateQueries({ queryKey: ["pending-loyalty-alerts"] });
    },
    onError: () => {
      toast.error("Hiba történt az elutasítás során");
    },
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("hu-HU") + " Ft";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "most";
    if (diffMins < 60) return `${diffMins} perce`;
    if (diffHours < 24) return `${diffHours} órája`;
    return `${Math.floor(diffHours / 24)} napja`;
  };

  const getMilestoneTooltip = (type: string) => {
    switch (type) {
      case 'weekly_regular':
        return 'Heti törzsvendég: legalább 3 beváltás ezen a héten';
      case 'monthly_vip':
        return 'Havi VIP: legalább 10 beváltás ebben a hónapban';
      case 'platinum':
        return 'Platina tag: elérte az 50. összesített beváltást';
      case 'legendary':
        return 'Legendás: elérte a 100. összesített beváltást';
      case 'returning':
        return 'Visszatérő vendég: harmadszor jár ezen a helyszínen';
      default:
        return 'Lojalitás mérföldkő elérése';
    }
  };
  if (isLoading) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="cgi-card">
        <CardContent className="py-8 text-center text-cgi-muted-foreground">
          Nem sikerült betölteni a lojalitás értesítéseket
        </CardContent>
      </Card>
    );
  }

  const milestones = data?.pending_milestones || [];
  const summary = data?.summary;

  return (
    <>
      <Card className="cgi-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-cgi-secondary" />
            Lojalitás értesítések
            <InfoTooltip content="Automatikusan detektált lojalitás mérföldkövek, amelyek jutalmazásra várnak. Ezek a felhasználók rendszeres látogatók." />
            {summary && summary.pending_count > 0 && (
              <Badge className="bg-cgi-primary text-cgi-primary-foreground ml-2">
                {summary.pending_count} új
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <div className="text-center py-8 text-cgi-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nincs új lojalitás mérföldkő</p>
              <p className="text-sm mt-1">A mérföldkövek automatikusan megjelennek itt</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="p-4 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30 hover:border-cgi-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <MobileTooltip content={getMilestoneTooltip(milestone.milestone_type)}>
                        <span className="text-2xl cursor-help">{milestone.milestone_emoji}</span>
                      </MobileTooltip>
                      <div>
                        <p className="font-medium text-cgi-surface-foreground">
                          <UserLink
                            userId={milestone.user_id}
                            userName={milestone.user_name}
                            size="md"
                            className="text-cgi-primary"
                          />{" "}
                          <span className="text-cgi-muted-foreground">elérte a</span>{" "}
                          <span className="text-cgi-secondary">"{milestone.milestone_label}"</span>{" "}
                          <span className="text-cgi-muted-foreground">státuszt</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-cgi-muted-foreground flex-wrap">
                          <VenueLink
                            venueId={milestone.venue_id}
                            venueName={milestone.venue_name}
                            size="xs"
                          />
                          <span>•</span>
                          <MobileTooltip content="Összesen hányszor váltott be itt">
                            <span>{milestone.visit_count}. látogatás</span>
                          </MobileTooltip>
                          {milestone.total_spend > 0 && (
                            <>
                              <span>•</span>
                              <MobileTooltip content="Összes költés ezen a helyszínen">
                                <span className="flex items-center gap-1">
                                  <Coins className="h-3 w-3" />
                                  {formatCurrency(milestone.total_spend)}
                                </span>
                              </MobileTooltip>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-cgi-muted-foreground mt-1">
                          {formatTimeAgo(milestone.achieved_at)}
                        </p>
                      </div>
                    </div>
                    <MobileTooltip content="Javasolt jutalom típus ehhez a mérföldkőhöz">
                      <Badge variant="outline" className="text-cgi-muted-foreground shrink-0">
                        {milestone.suggested_reward}
                      </Badge>
                    </MobileTooltip>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-cgi-muted/30">
                    <Button
                      size="sm"
                      onClick={() => setSelectedMilestone(milestone)}
                      className="cgi-button-primary"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Jutalom küldése
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/users/${milestone.user_id}`)}
                      className="cgi-button-secondary"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profil
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissMutation.mutate(milestone.id)}
                      disabled={dismissMutation.isPending}
                      className="ml-auto text-cgi-muted-foreground hover:text-cgi-error"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {summary && summary.today_total > 0 && (
            <div className="mt-4 pt-4 border-t border-cgi-muted/30">
              <p className="text-sm text-cgi-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Mai összesítés: {summary.today_total} új mérföldkő
                {Object.entries(summary.by_type).length > 0 && (
                  <span className="ml-2">
                    ({Object.entries(summary.by_type)
                      .map(([type, count]) => `${count} ${type}`)
                      .join(", ")})
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMilestone && (
        <SendLoyaltyRewardModal
          milestone={selectedMilestone}
          open={!!selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
          onSuccess={() => {
            setSelectedMilestone(null);
            queryClient.invalidateQueries({ queryKey: ["pending-loyalty-alerts"] });
          }}
        />
      )}
    </>
  );
}
