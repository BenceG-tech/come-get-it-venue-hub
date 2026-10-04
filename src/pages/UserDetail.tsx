import { useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportDropdown } from "@/components/ExportDropdown";
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
  UserWeeklyTrends,
  UserDrinkPreferences,
  UserActivityHeatmap,
  UserNotificationHistory,
  UserPointsFlow,
  UserVenueAffinity,
  AINotificationSuggestions,
  SystemRulesPanel,
} from "@/components/user";
import { ManualNotificationModal } from "@/components/user/ManualNotificationModal";
import { VenueLink } from "@/components/ui/entity-links";
import { AcquisitionSource } from "@/components/AcquisitionSource";
import {
  exportUserProfileToCSV,
  exportUserRedemptionsToCSV,
  exportUserPointsToCSV
} from "@/lib/exportUtils";

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
    churn_factors?: string[];
    ltv: number;
    roi?: number;
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
  platform_comparison?: {
    user_redemptions_per_month: number;
    user_spend_per_redemption: number;
    user_venues_visited: number;
    user_roi: number;
    platform_avg: {
      avg_redemptions_per_month: number;
      avg_spend_per_redemption: number;
      avg_venues_visited: number;
      avg_roi: number;
    };
  };
  predictions?: {
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
  } | null;
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
    today_redemption?: {
      redeemed: boolean;
      redeemed_at?: string;
      drink_name?: string;
    } | null;
    next_window?: { start: string; end: string } | null;
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
  const location = useLocation();
  const from = typeof location.state?.from === "string" && /^\/users(?:\?|$)/.test(location.state.from) ? location.state.from : "/users";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = ["overview", "insights", "activity", "redemptions", "points", "communication"].includes(requestedTab || "")
    ? requestedTab!
    : "overview";
  
  // State for the modal; the active section lives in the URL for direct links and browser navigation.
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const setActiveTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const { data, isLoading, error } = useQuery<ExtendedUserStats>({
    queryKey: ["user-stats-extended", userId],
    queryFn: async () => {
      const response = await fetch(
        `https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-user-stats-extended?user_id=${userId}`,
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

  // Keep communication shortcuts available from the overview and sticky header.
  const handleNavigateToAI = () => {
    setActiveTab("communication");
  };

  const handleNavigateToNotifications = () => {
    setActiveTab("communication");
  };

  const handleOpenManualNotification = () => {
    setShowNotificationModal(true);
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
          <Button onClick={() => navigate(from)} variant="outline">
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-cgi-muted-foreground">
          <button onClick={() => navigate(from)} className="hover:text-cgi-surface-foreground transition-colors">
            Felhasználók
          </button>
          <span>›</span>
          <span className="text-cgi-surface-foreground truncate">{user.name}</span>
        </div>

        {/* Sticky header with actions */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-cgi-surface/95 backdrop-blur-sm border-b border-cgi-muted">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(from)}
                className="cgi-button-ghost shrink-0"
                aria-label="Vissza a felhasználókhoz"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Vissza</span>
              </Button>
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-cgi-secondary/20 text-cgi-secondary text-sm">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-cgi-surface-foreground truncate">{user.name}</p>
                <p className="text-xs text-cgi-muted-foreground truncate">{user.email || user.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={handleNavigateToAI} className="gap-2"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">AI-javaslatok</span></Button>
              <Button
                size="sm"
                onClick={() => setShowNotificationModal(true)}
                className="bg-cgi-primary hover:bg-cgi-primary/90 text-cgi-surface gap-2"
                aria-label="Push értesítés küldése"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Push küldése</span>
              </Button>
              <SystemRulesPanel />
              <ExportDropdown
                options={[
                  {
                    label: "Teljes profil (CSV)",
                    onClick: () => exportUserProfileToCSV({
                      user: { name: user.name, email: user.email, phone: user.phone, created_at: user.created_at },
                      points,
                      scores,
                      stats
                    })
                  },
                  {
                    label: "Csak beváltások",
                    onClick: () => exportUserRedemptionsToCSV(user.name, free_drink_redemptions, reward_redemptions)
                  },
                  {
                    label: "Csak pontok",
                    onClick: () => exportUserPointsToCSV(user.name, points_flow.recent_transactions)
                  }
                ]}
                tooltipContent="Felhasználói adatok exportálása CSV formátumban"
              />
            </div>
          </div>
        </div>

        {/* User profile card */}
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
              <AcquisitionSource value={user.signup_source} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Pontegyenleg", value: points.balance.toLocaleString("hu-HU"), tab: "points", detail: "Ponttörténet megnyitása" },
            { label: "Összes beváltás", value: String(stats.total_free_drink_redemptions + stats.total_reward_redemptions), tab: "redemptions", detail: `${stats.total_free_drink_redemptions} ital · ${stats.total_reward_redemptions} jutalom` },
            { label: "Appmegnyitás · 7 nap", value: String(stats.app_opens_last_7_days), tab: "activity", detail: "Rögzített aktivitás megnyitása" },
            { label: "Beváltás · 30 nap", value: String(stats.redemptions_last_30_days), tab: "redemptions", detail: "Beváltási előzmények" },
          ].map((metric) => <button key={metric.label} onClick={() => setActiveTab(metric.tab)} className="cgi-card rounded-lg border border-cgi-muted/40 px-4 py-3 text-left hover:border-cgi-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cgi-primary"><p className="text-xs text-cgi-muted-foreground">{metric.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-cgi-muted-foreground">{metric.detail}</p></button>)}
        </div>

        {/* Tabs — five focused groups, each directly linkable */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="sticky top-[68px] z-10 -mx-4 px-4 py-2 bg-cgi-surface/95 backdrop-blur-sm border-b border-cgi-muted/40">
          <TabsList className="bg-cgi-muted/30 h-auto gap-1 w-full overflow-x-auto justify-start no-scrollbar">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cgi-primary">
              <TrendingUp className="h-4 w-4 mr-2" />Áttekintés
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-cgi-primary">
              <MapPin className="h-4 w-4 mr-2" />Preferenciák
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-cgi-primary">
              <Activity className="h-4 w-4 mr-2" />Aktivitás
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="data-[state=active]:bg-cgi-primary">
              <Wine className="h-4 w-4 mr-2" />Beváltások
            </TabsTrigger>
            <TabsTrigger value="points" className="data-[state=active]:bg-cgi-primary"><Coins className="h-4 w-4 mr-2" />Pontok</TabsTrigger>
            <TabsTrigger value="communication" className="data-[state=active]:bg-cgi-primary">
              <Bell className="h-4 w-4 mr-2" />Kommunikáció
            </TabsTrigger>
          </TabsList>
          </div>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="cgi-card p-5">
              <div className="flex flex-wrap justify-between gap-4"><div><h3 className="font-semibold">Következő lépés</h3><p className="mt-2 text-sm text-cgi-muted-foreground">{stats.total_free_drink_redemptions + stats.total_reward_redemptions === 0 ? "Még nincs rögzített beváltás. Nézd meg, milyen aktuális ajánlatot javasolhatunk az első látogatáshoz." : stats.days_since_last_activity != null && stats.days_since_last_activity >= 14 ? `${stats.days_since_last_activity} napja nem volt rögzített aktivitás. Ellenőrizd a korábbi látogatásokat és a kommunikációt.` : "Nézd át a legutóbbi aktivitást, vagy készíts személyre szabott értesítési javaslatot."}</p></div><Button onClick={handleNavigateToAI} className="shrink-0"><Sparkles className="mr-2 h-4 w-4" />AI-javaslatok</Button></div>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="cgi-card p-5"><h3 className="mb-3 font-semibold">Gyakran választott hely és ital</h3><p className="text-xs text-cgi-muted-foreground mb-3">Korábbi beváltások alapján</p>{stats.favorite_venue ? <VenueLink venueId={stats.favorite_venue.venue_id} venueName={stats.favorite_venue.venue_name} /> : <p className="text-sm text-cgi-muted-foreground">Még nincs látogatott helyszín.</p>}<p className="mt-3 text-sm">{stats.favorite_drink ? `${stats.favorite_drink.drink_name} · ${stats.favorite_drink.count} beváltás` : "Még nincs rögzített italpreferencia."}</p><Button variant="link" className="px-0 mt-2" onClick={() => setActiveTab("insights")}>Összes preferencia →</Button></Card>
              <Card className="cgi-card p-5"><div className="mb-3 flex justify-between gap-2"><h3 className="font-semibold">Legutóbbi események</h3><Button variant="link" className="h-auto p-0" onClick={() => setActiveTab("activity")}>Összes</Button></div>{recent_activity.length === 0 ? <p className="text-sm text-cgi-muted-foreground">Nincs rögzített aktivitás.</p> : <div className="space-y-3">{recent_activity.slice(0, 4).map((activity, index) => <div key={`${activity.created_at}-${index}`} className="flex justify-between gap-3 text-sm"><span>{eventTypeLabels[activity.event_type] || activity.event_type}</span><time className="shrink-0 text-xs text-cgi-muted-foreground">{format(new Date(activity.created_at), "MM.dd HH:mm", { locale: hu })}</time></div>)}</div>}</Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <p className="text-sm text-cgi-muted-foreground">Megfigyelt aktivitás és beváltások alapján. Ezek a korábbi választásokat mutatják.</p>
            <UserVenueAffinity venues={venue_affinity} />
            <UserDrinkPreferences preferences={drink_preferences} />
          </TabsContent>

          {/* ACTIVITY (merged: behavior + activity + heatmap + trends + drinks) */}
          <TabsContent value="activity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <UserWeeklyTrends data={weekly_trends} />
              <UserDrinkPreferences preferences={drink_preferences} />
            </div>
            <UserActivityHeatmap heatmapData={hourly_heatmap} />

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

          {/* REDEMPTIONS (merged: free drinks + rewards + venues + points) */}
          <TabsContent value="redemptions" className="space-y-4">
            <Tabs defaultValue="drinks" className="space-y-4">
              <TabsList className="bg-cgi-muted/30">
                <TabsTrigger value="drinks" className="data-[state=active]:bg-cgi-primary"><Wine className="h-4 w-4 mr-2" />Italok & Jutalmak</TabsTrigger>
                <TabsTrigger value="venues" className="data-[state=active]:bg-cgi-primary"><MapPin className="h-4 w-4 mr-2" />Helyszínek</TabsTrigger>
              </TabsList>
              <TabsContent value="drinks">
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

            </Tabs>
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

          {/* COMMUNICATION (merged: AI + notifications) */}
          <TabsContent value="communication" className="space-y-4">
            <Card className="cgi-card">
              <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-cgi-surface-foreground">Egyedi push küldése</p>
                  <p className="text-sm text-cgi-muted-foreground">Küldj kézzel összeállított értesítést ennek a felhasználónak.</p>
                </div>
                <Button onClick={handleOpenManualNotification} className="bg-cgi-primary hover:bg-cgi-primary/90 text-cgi-surface gap-2">
                  <Bell className="h-4 w-4" />
                  Push küldése
                </Button>
              </CardContent>
            </Card>
            <AINotificationSuggestions userId={userId!} userName={user.name} />
            <UserNotificationHistory notifications={notification_history} />
          </TabsContent>
        </Tabs>


        {/* Manual Notification Modal */}
        <ManualNotificationModal
          userId={userId!}
          userName={user.name}
          open={showNotificationModal}
          onOpenChange={setShowNotificationModal}
        />
      </div>
    </PageLayout>
  );
}
