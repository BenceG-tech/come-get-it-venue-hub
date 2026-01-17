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
  User,
  Calendar,
  Clock,
  Gift,
  TrendingUp,
  MapPin,
  Smartphone,
  Mail,
  Phone,
  Activity,
  Wine
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

interface UserStats {
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
  stats: {
    total_sessions: number;
    avg_session_duration_seconds: number;
    total_free_drink_redemptions: number;
    total_reward_redemptions: number;
    favorite_venue: { id: string; name: string; visit_count: number } | null;
    favorite_drink: { name: string; count: number } | null;
    first_seen: string;
    last_seen: string | null;
    days_since_last_activity: number | null;
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
  venue_affinity: Array<{
    venue_id: string;
    venue_name: string;
    visit_count: number;
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

  const { data, isLoading, error } = useQuery<UserStats>({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-stats?user_id=${userId}`,
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
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
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
          <p className="text-red-400 mb-4">Hiba történt a felhasználó betöltése közben</p>
          <Button onClick={() => navigate("/users")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vissza a listához
          </Button>
        </div>
      </PageLayout>
    );
  }

  const { user, points, stats, recent_activity, free_drink_redemptions, reward_redemptions, venue_affinity } = data;

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/users")}
          className="cgi-button-ghost"
        >
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
                  {user.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </span>
                  )}
                  {user.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {user.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Tag {format(new Date(user.created_at), "yyyy. MMMM d.", { locale: hu })} óta
                  </span>
                </div>
                {user.last_seen_at && (
                  <p className="text-sm text-cgi-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Utoljára online: {formatDistanceToNow(new Date(user.last_seen_at), {
                      addSuffix: true,
                      locale: hu
                    })}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Badge className="bg-cgi-secondary/20 text-cgi-secondary border-cgi-secondary/30">
                  {user.signup_source || "mobile_app"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cgi-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-cgi-secondary">{points.balance}</p>
              <p className="text-sm text-cgi-muted-foreground">Jelenlegi pontok</p>
            </CardContent>
          </Card>

          <Card className="cgi-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-cgi-surface-foreground">{stats.total_free_drink_redemptions}</p>
              <p className="text-sm text-cgi-muted-foreground">Ingyen italok</p>
            </CardContent>
          </Card>

          <Card className="cgi-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-cgi-surface-foreground">{stats.total_sessions}</p>
              <p className="text-sm text-cgi-muted-foreground">Munkamenetek</p>
            </CardContent>
          </Card>

          <Card className="cgi-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-cgi-surface-foreground">
                {formatDuration(stats.avg_session_duration_seconds)}
              </p>
              <p className="text-sm text-cgi-muted-foreground">Átl. munkamenet</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="bg-cgi-muted/30">
            <TabsTrigger value="activity" className="data-[state=active]:bg-cgi-primary">
              <Activity className="h-4 w-4 mr-2" />
              Aktivitás
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="data-[state=active]:bg-cgi-primary">
              <Wine className="h-4 w-4 mr-2" />
              Beváltások
            </TabsTrigger>
            <TabsTrigger value="venues" className="data-[state=active]:bg-cgi-primary">
              <MapPin className="h-4 w-4 mr-2" />
              Helyszínek
            </TabsTrigger>
            <TabsTrigger value="points" className="data-[state=active]:bg-cgi-primary">
              <TrendingUp className="h-4 w-4 mr-2" />
              Pontok
            </TabsTrigger>
          </TabsList>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="cgi-card">
              <CardHeader>
                <CardTitle className="text-cgi-surface-foreground">Legutóbbi aktivitás</CardTitle>
              </CardHeader>
              <CardContent>
                {recent_activity.length === 0 ? (
                  <p className="text-center py-8 text-cgi-muted-foreground">Nincs rögzített aktivitás</p>
                ) : (
                  <div className="space-y-4">
                    {recent_activity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg bg-cgi-muted/20"
                      >
                        <div className="h-10 w-10 rounded-full bg-cgi-primary/20 flex items-center justify-center">
                          <Activity className="h-5 w-5 text-cgi-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-cgi-surface-foreground">
                            {eventTypeLabels[activity.event_type] || activity.event_type}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-cgi-muted-foreground">
                            <span>{format(new Date(activity.created_at), "yyyy.MM.dd HH:mm", { locale: hu })}</span>
                            {activity.app_version && (
                              <Badge variant="outline" className="text-xs">
                                v{activity.app_version}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {activity.device_info && (
                          <div className="flex items-center gap-1 text-sm text-cgi-muted-foreground">
                            <Smartphone className="h-4 w-4" />
                            {activity.device_info}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redemptions Tab */}
          <TabsContent value="redemptions">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Free Drinks */}
              <Card className="cgi-card">
                <CardHeader>
                  <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
                    <Wine className="h-5 w-5 text-cgi-secondary" />
                    Ingyen italok ({free_drink_redemptions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {free_drink_redemptions.length === 0 ? (
                    <p className="text-center py-8 text-cgi-muted-foreground">Nincs beváltás</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {free_drink_redemptions.map((redemption) => (
                        <div
                          key={redemption.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-cgi-muted/20"
                        >
                          <div>
                            <p className="font-medium text-cgi-surface-foreground">{redemption.drink}</p>
                            <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {redemption.venue_name}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-cgi-secondary">{redemption.value} Ft</p>
                            <p className="text-cgi-muted-foreground">
                              {format(new Date(redemption.redeemed_at), "MM.dd HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rewards */}
              <Card className="cgi-card">
                <CardHeader>
                  <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
                    <Gift className="h-5 w-5 text-cgi-primary" />
                    Jutalmak ({reward_redemptions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reward_redemptions.length === 0 ? (
                    <p className="text-center py-8 text-cgi-muted-foreground">Nincs beváltott jutalom</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {reward_redemptions.map((redemption) => (
                        <div
                          key={redemption.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-cgi-muted/20"
                        >
                          <div>
                            <p className="font-medium text-cgi-surface-foreground">{redemption.reward_name}</p>
                            <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {redemption.venue_name}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-cgi-primary">-{redemption.points_spent} pont</p>
                            <p className="text-cgi-muted-foreground">
                              {format(new Date(redemption.redeemed_at), "MM.dd HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Venues Tab */}
          <TabsContent value="venues">
            <Card className="cgi-card">
              <CardHeader>
                <CardTitle className="text-cgi-surface-foreground">Kedvenc helyszínek</CardTitle>
              </CardHeader>
              <CardContent>
                {venue_affinity.length === 0 ? (
                  <p className="text-center py-8 text-cgi-muted-foreground">Nincs látogatott helyszín</p>
                ) : (
                  <div className="space-y-3">
                    {venue_affinity.map((venue, index) => (
                      <div
                        key={venue.venue_id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-cgi-muted/20"
                      >
                        <div className="h-10 w-10 rounded-full bg-cgi-primary/20 flex items-center justify-center text-cgi-primary font-bold">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-cgi-surface-foreground">{venue.venue_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-cgi-secondary">{venue.visit_count}</p>
                          <p className="text-xs text-cgi-muted-foreground">beváltás</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Points Tab */}
          <TabsContent value="points">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cgi-card">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-cgi-secondary">{points.balance}</p>
                  <p className="text-sm text-cgi-muted-foreground mt-1">Jelenlegi egyenleg</p>
                </CardContent>
              </Card>

              <Card className="cgi-card">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-green-400">{points.lifetime_earned}</p>
                  <p className="text-sm text-cgi-muted-foreground mt-1">Összesen szerzett</p>
                </CardContent>
              </Card>

              <Card className="cgi-card">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-red-400">{points.lifetime_spent}</p>
                  <p className="text-sm text-cgi-muted-foreground mt-1">Összesen elköltött</p>
                </CardContent>
              </Card>
            </div>

            <Card className="cgi-card mt-4">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cgi-muted-foreground">Összköltés a helyszíneken</span>
                  <span className="font-bold text-cgi-surface-foreground">
                    {points.total_spend.toLocaleString()} Ft
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
