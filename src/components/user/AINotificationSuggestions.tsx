import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Check, 
  X, 
  RefreshCw, 
  Edit, 
  Send,
  AlertCircle,
  Lightbulb
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

interface Suggestion {
  type: string;
  priority: "high" | "medium" | "low";
  title_hu: string;
  body_hu: string;
  reasoning: string;
  targeting?: {
    geofence?: { enabled: boolean; radius_meters: number };
    venue_ids?: string[];
  };
  best_send_time?: string;
  confidence_score?: number;
}

interface AINotificationSuggestionsProps {
  userId: string;
  userName: string;
  onSend?: (suggestion: Suggestion) => void;
}

export function AINotificationSuggestions({ userId, userName, onSend }: AINotificationSuggestionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null);
  const [editedBody, setEditedBody] = useState("");

  const { data: suggestions, isLoading, refetch, isFetching } = useQuery<Suggestion[]>({
    queryKey: ["ai-suggestions", userId],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("suggest-user-notification", {
        body: { user_id: userId },
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`
        }
      });

      if (response.error) throw response.error;
      return response.data?.suggestions || [];
    },
    enabled: false, // Only fetch when user clicks the button
    staleTime: 0
  });

  const sendMutation = useMutation({
    mutationFn: async (suggestion: Suggestion) => {
      const session = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("send-user-notification", {
        body: {
          user_id: userId,
          title: suggestion.title_hu,
          body: suggestion.body_hu.replace("{name}", userName.split(" ")[0])
        },
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Értesítés elküldve",
        description: "Az értesítés sikeresen el lett küldve a felhasználónak."
      });
      queryClient.invalidateQueries({ queryKey: ["user-stats-extended", userId] });
    },
    onError: (error) => {
      toast({
        title: "Hiba",
        description: "Az értesítés küldése sikertelen.",
        variant: "destructive"
      });
    }
  });

  const handleSend = (suggestion: Suggestion) => {
    sendMutation.mutate(suggestion);
    if (onSend) onSend(suggestion);
  };

  const handleEditSave = () => {
    if (editingSuggestion) {
      const modified = { ...editingSuggestion, body_hu: editedBody };
      handleSend(modified);
      setEditingSuggestion(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-cgi-error/20 text-cgi-error border-cgi-error/30">Magas</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Közepes</Badge>;
      case "low":
        return <Badge className="bg-cgi-muted/40 text-cgi-muted-foreground border-cgi-muted/50">Alacsony</Badge>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      reactivation: "🔄 Visszacsábító",
      points_reminder: "🎯 Pont emlékeztető",
      free_drink: "🍺 Ingyen ital",
      reward_available: "🎁 Jutalom elérhető",
      venue_suggestion: "📍 Helyszín ajánló",
      general: "💬 Általános"
    };
    return labels[type] || type;
  };

  return (
    <Card className="cgi-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cgi-primary" />
            AI Értesítési Javaslatok
          </CardTitle>
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            size="sm"
            className="bg-cgi-primary text-cgi-primary-foreground hover:bg-cgi-primary/80"
          >
            {isFetching ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {suggestions ? "Újragenerálás" : "Javaslatok generálása"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || isFetching ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !suggestions || suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-cgi-muted-foreground mx-auto mb-3" />
            <p className="text-cgi-muted-foreground">
              Kattints a "Javaslatok generálása" gombra az AI ajánlatok megtekintéséhez
            </p>
            <p className="text-sm text-cgi-muted-foreground mt-2">
              Az AI a felhasználó adatai alapján személyre szabott értesítéseket javasol
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-cgi-surface-foreground">
                      {getTypeLabel(suggestion.type)}
                    </span>
                    {getPriorityBadge(suggestion.priority)}
                    {suggestion.confidence_score && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence_score * 100)}% biztos
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="bg-cgi-surface/50 rounded-lg p-3 mb-3 border border-cgi-muted/20">
                  <p className="font-medium text-cgi-surface-foreground mb-1">
                    {suggestion.title_hu}
                  </p>
                  <p className="text-sm text-cgi-muted-foreground">
                    {suggestion.body_hu.replace("{name}", userName.split(" ")[0])}
                  </p>
                </div>

                <div className="flex items-start gap-2 mb-3 text-xs text-cgi-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{suggestion.reasoning}</span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => handleSend(suggestion)}
                    disabled={sendMutation.isPending}
                    className="bg-cgi-success/20 text-cgi-success hover:bg-cgi-success/30 border border-cgi-success/30"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Elfogad & Küld
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSuggestion(suggestion);
                      setEditedBody(suggestion.body_hu);
                    }}
                    className="border-cgi-muted/50"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Szerkeszt
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => refetch()}
                    className="text-cgi-muted-foreground hover:text-cgi-surface-foreground"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Új javaslat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingSuggestion} onOpenChange={() => setEditingSuggestion(null)}>
        <DialogContent className="bg-cgi-surface border-cgi-muted/30">
          <DialogHeader>
            <DialogTitle className="text-cgi-surface-foreground">
              Értesítés szerkesztése
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-cgi-muted-foreground mb-2">Cím</p>
              <p className="font-medium text-cgi-surface-foreground">
                {editingSuggestion?.title_hu}
              </p>
            </div>
            <div>
              <p className="text-sm text-cgi-muted-foreground mb-2">Üzenet</p>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="min-h-[100px] bg-cgi-muted/20 border-cgi-muted/30 text-cgi-surface-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSuggestion(null)}>
              Mégse
            </Button>
            <Button onClick={handleEditSave} disabled={sendMutation.isPending}>
              <Send className="h-4 w-4 mr-2" />
              Küldés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}