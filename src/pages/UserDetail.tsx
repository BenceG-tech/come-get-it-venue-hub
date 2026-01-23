import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Gift,
  TrendingUp,
  MapPin,
  Smartphone,
  Mail,
  Phone,
  Activity,
  Wine,
  Sparkles,
  Bell,
  Coins
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import {
  UserScorecard,
  UserWeeklyTrends,
  UserDrinkPreferences,
  UserActivityHeatmap,
  UserNotificationHistory,
  UserPointsFlow,
  UserVenueAffinity,
  AINotificationSuggestions,
  UserBehaviorStory,
  BehaviorPatternBadges
} from "@/components/user";

interface ExtendedUserStats {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    last_seen_at: string | null;
    signup_source: string | null;
    device_info: unknown;
  };
  points: {
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
    total_spend: number;
  };
  scores: {
    engagement_score: number;
    churn_risk: "low" | "medium" | "high";
    ltv: number;
    preference_profile: string[];
  };
  stats: {
    total_sessions: number;
    avg_session_duration_seconds: number;
    unique_active_days: number;
    days_since_registration: number;
    total_free_drink_redemptions: number;
    total_reward_redemptions: number;
    favorite_venue: { venue_id: string; venue_name: string; visit_count: number } | null;
    favorite_drink: { drink_name: string; category: string | null; count: number } | null;
    days_since_last_activity: number | null;
    app_opens_last_7_days: number;
    redemptions_last_30_days: number;
  };
  weekly_trends: Array<{ week: string; sessions: number; redemptions: number }>;
  hourly_heatmap: number[][];
  drink_preferences: Array<{ drink_name: string; category: string | null; count: number }>;
  venue_affinity: Array<{
    venue_id: string;
    venue_name: string;
    visit_count: number;
    first_visit: string | null;
    last_visit: string | null;
    preferred_days: number[];
    preferred_hours: number[];
  }>;
  points_flow: {
    earnings_by_type: Record<string, number>;
    spending_by_type: Record<string, number>;
    recent_transactions: Array<{
      id: string;
      amount: number;
      type: string;
      description: string | null;
      created_at: string;
    }>;
  };
  recent_activity: Array<{
    event_type: string;
    venue_id: string | null;
    metadata: Record<string, unknown>;
    device_info: string | null;
    app_version: string | null;
    created_at: string;
  }>;
  free_drink_redemptions: Array<{
    id: string;
    venue_name: string;
    venue_id: string;
    drink: string;
    value: number;
    redeemed_at: string;
  }>;
  reward_redemptions: Array<{
    id: string;
    venue_name: string;
    venue_id: string;
    reward_name: string;
    points_spent: number;
    redeemed_at: string;
  }>;
  notification_history: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    sent_at: string;
    opened_at: string | null;
  }>;
}

const eventTypeLabels: Record<string, string> = {
  app_open: "App megnyitva",
  app_close: "App bezárva",
  login: "Bejelentkezés",
  signup: "Regisztráció",
  qr_generated: "QR kód generálva",
  venue_viewed: "Helyszín megtekintve",
  reward_viewed: "Jutalom megtekintve",
  redemption_attempt: "Beváltási kísérlet",
  redemption_success: "Sikeres beváltás",
  profile_viewed: "Profil megtekintve",
  search_performed: "Keresés",
  notification_received: "Értesítés érkezett",
  notification_clicked: "Értesítés megnyitva"
};

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<ExtendedUserStats>({
    queryKey: ["user-stats-extended", userId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-stats-extended?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch user stats");
      }

      return response.json();
    },
    enabled: !!userId
  });

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}mp`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}p ${secs}mp`;
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </PageLayout>
    );
  }

  if (error || !data) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-cgi-error mb-4">Hiba történt a felhasználó betöltése közben</p>
          <Button onClick={() => navigate("/users")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vissza a listához
          </Button>
        </div>
      </PageLayout>
    );
  }

  const { user, points, scores, stats, weekly_trends, hourly_heatmap, drink_preferences, venue_affinity, points_flow, recent_activity, free_drink_redemptions, reward_redemptions, notification_history } = data;

  return (
    <PageLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/users")} className="cgi-button-ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza a felhasználókhoz
        </Button>

        {/* User Header */}
        <Card className="cgi-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-cgi-secondary/20 text-cgi-secondary text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-cgi-surface-foreground">{user.name}</h2>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-cgi-muted-foreground">
                  {user.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{user.email}</span>}
                  {user.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{user.phone}</span>}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Tag {format(new Date(user.created_at), "yyyy. MMMM d.", { locale: hu })} óta
                  </span>
                </div>
                {user.last_seen_at && (
                  <p className="text-sm text-cgi-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Utoljára: {formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true, locale: hu })}
                  </p>
                )}
              </div>
              <Badge className="bg-cgi-secondary/20 text-cgi-secondary border-cgi-secondary/30">
                {user.signup_source || "mobile_app"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Scorecard */}
        <UserScorecard
          engagementScore={scores.engagement_score}
          churnRisk={scores.churn_risk}
          ltv={scores.ltv}
          preferenceProfile={scores.preference_profile}
        />

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-cgi-muted/30 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cgi-primary">
              <TrendingUp className="h-4 w-4 mr-2" />Áttekintés
            </TabsTrigger>
            <TabsTrigger value="behavior" className="data-[state=active]:bg-cgi-primary">
              <Activity className="h-4 w-4 mr-2" />Viselkedés
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-cgi-primary">
              <Clock className="h-4 w-4 mr-2" />Aktivitás
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="data-[state=active]:bg-cgi-primary">
              <Wine className="h-4 w-4 mr-2" />Beváltások
            </TabsTrigger>
            <TabsTrigger value="venues" className="data-[state=active]:bg-cgi-primary">
              <MapPin className="h-4 w-4 mr-2" />Helyszínek
            </TabsTrigger>
            <TabsTrigger value="points" className="data-[state=active]:bg-cgi-primary">
              <Coins className="h-4 w-4 mr-2" />Pontok
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-cgi-primary">
              <Sparkles className="h-4 w-4 mr-2" />AI Ajánlatok
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-cgi-primary">
              <Bell className="h-4 w-4 mr-2" />Értesítések
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* User Behavior Story - AI generated narrative */}
            <UserBehaviorStory 
              userId={userId!} 
              userName={user.name}
              onGenerateNotification={() => {
                // Switch to AI tab
                const aiTab = document.querySelector('[value="ai"]') as HTMLElement;
                aiTab?.click();
              }}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <UserWeeklyTrends data={weekly_trends} />
              <UserDrinkPreferences preferences={drink_preferences} />
            </div>
            <div className="mt-4">
              <UserActivityHeatmap heatmapData={hourly_heatmap} />
            </div>
          </TabsContent>

          <TabsContent value="behavior">
            {/* Behavior Analysis with Patterns, Predictions, Micro-moments */}
            <BehaviorPatternBadges userId={userId!} />
          </TabsContent>

          <TabsContent value="activity">
            <Card className="cgi-card">
              <CardHeader><CardTitle className="text-cgi-surface-foreground">Legutóbbi aktivitás</CardTitle></CardHeader>
              <CardContent>
                {recent_activity.length === 0 ? (
                  <p className="text-center py-8 text-cgi-muted-foreground">Nincs rögzített aktivitás</p>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {recent_activity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-cgi-muted/20">
                        <div className="h-10 w-10 rounded-full bg-cgi-primary/20 flex items-center justify-center">
                          <Activity className="h-5 w-5 text-cgi-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-cgi-surface-foreground">{eventTypeLabels[activity.event_type] || activity.event_type}</p>
                          <div className="flex items-center gap-2 text-sm text-cgi-muted-foreground">
                            <span>{format(new Date(activity.created_at), "yyyy.MM.dd HH:mm", { locale: hu })}</span>
                            {activity.app_version && <Badge variant="outline" className="text-xs">v{activity.app_version}</Badge>}
                          </div>
                        </div>
                        {activity.device_info && <span className="text-sm text-cgi-muted-foreground flex items-center gap-1"><Smartphone className="h-4 w-4" />{activity.device_info}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redemptions">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="cgi-card">
                <CardHeader><CardTitle className="text-cgi-surface-foreground flex items-center gap-2"><Wine className="h-5 w-5 text-cgi-secondary" />Ingyen italok ({free_drink_redemptions.length})</CardTitle></CardHeader>
                <CardContent>
                  {free_drink_redemptions.length === 0 ? <p className="text-center py-8 text-cgi-muted-foreground">Nincs beváltás</p> : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {free_drink_redemptions.map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-cgi-muted/20">
                          <div><p className="font-medium text-cgi-surface-foreground">{r.drink}</p><p className="text-sm text-cgi-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{r.venue_name}</p></div>
                          <div className="text-right text-sm"><p className="text-cgi-secondary">{r.value} Ft</p><p className="text-cgi-muted-foreground">{format(new Date(r.redeemed_at), "MM.dd HH:mm")}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="cgi-card">
                <CardHeader><CardTitle className="text-cgi-surface-foreground flex items-center gap-2"><Gift className="h-5 w-5 text-cgi-primary" />Jutalmak ({reward_redemptions.length})</CardTitle></CardHeader>
                <CardContent>
                  {reward_redemptions.length === 0 ? <p className="text-center py-8 text-cgi-muted-foreground">Nincs beváltott jutalom</p> : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {reward_redemptions.map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-cgi-muted/20">
                          <div><p className="font-medium text-cgi-surface-foreground">{r.reward_name}</p><p className="text-sm text-cgi-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{r.venue_name}</p></div>
                          <div className="text-right text-sm"><p className="text-cgi-primary">-{r.points_spent} pont</p><p className="text-cgi-muted-foreground">{format(new Date(r.redeemed_at), "MM.dd HH:mm")}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="venues">
            <UserVenueAffinity venues={venue_affinity} />
          </TabsContent>

          <TabsContent value="points">
            <UserPointsFlow
              earningsByType={points_flow.earnings_by_type}
              spendingByType={points_flow.spending_by_type}
              recentTransactions={points_flow.recent_transactions}
              currentBalance={points.balance}
              lifetimeEarned={points.lifetime_earned}
              lifetimeSpent={points.lifetime_spent}
            />
          </TabsContent>

          <TabsContent value="ai">
            <AINotificationSuggestions userId={userId!} userName={user.name} />
          </TabsContent>

          <TabsContent value="notifications">
            <UserNotificationHistory notifications={notification_history} />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}