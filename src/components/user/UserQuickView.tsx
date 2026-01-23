import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Gift, 
  MapPin, 
  TrendingUp,
  Clock,
  Bell,
  Award,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Beer
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { hu } from "date-fns/locale";
import { ManualNotificationModal } from "./ManualNotificationModal";
import { SingleBonusPointsModal } from "./SingleBonusPointsModal";

interface UserQuickViewProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  };
  points: {
    balance: number;
    lifetime_earned: number;
    total_spend: number;
  };
  scores: {
    engagement_score: number;
    churn_risk: "low" | "medium" | "high";
    ltv: number;
    roi: number;
    preference_profile: string[];
  };
  stats: {
    days_since_registration: number;
    total_free_drink_redemptions: number;
    favorite_venue: { venue_id: string; venue_name: string } | null;
    favorite_drink: { drink_name: string; count: number } | null;
  };
  venue_affinity: Array<{
    venue_id: string;
    venue_name: string;
    visit_count: number;
    today_redemption: {
      redeemed: boolean;
      redeemed_at?: string;
      drink_name?: string;
    } | null;
    next_window: { start: string; end: string } | null;
  }>;
  drink_preferences: Array<{
    drink_name: string;
    count: number;
  }>;
}

export function UserQuickView({ userId, open, onOpenChange }: UserQuickViewProps) {
  const navigate = useNavigate();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);

  const { data, isLoading, error } = useQuery<ExtendedUserStats>({
    queryKey: ["user-quick-view", userId],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-user-stats-extended?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user stats");
      }

      return response.json();
    },
    enabled: !!userId && open,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getChurnBadge = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Alacsony churn</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Közepes churn</Badge>;
      case "high":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Magas churn</Badge>;
    }
  };

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/users/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-cgi-primary" />
            Felhasználó gyorsnézet
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p>Hiba történt az adatok betöltése közben</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={data.user.avatar_url || undefined} />
                <AvatarFallback className="bg-cgi-secondary/20 text-cgi-secondary text-xl">
                  {getInitials(data.user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-cgi-surface-foreground">{data.user.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-cgi-muted-foreground">
                  {data.user.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {data.user.email}
                    </span>
                  )}
                  {data.user.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {data.user.phone}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-cgi-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Tag: {data.stats.days_since_registration} napja
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Basic Stats */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-cgi-muted-foreground uppercase tracking-wider">📊 Alap</p>
                <div className="space-y-1">
                  <p className="text-sm text-cgi-surface-foreground">
                    <span className="font-medium">{data.stats.total_free_drink_redemptions}</span> beváltás
                  </p>
                  <p className="text-sm text-cgi-surface-foreground">
                    <span className="font-medium">{data.venue_affinity.length}</span> helyszín
                  </p>
                  <p className="text-sm text-cgi-surface-foreground">
                    <span className="font-medium">{data.points.balance}</span> pont
                  </p>
                </div>
              </div>

              {/* Financial Stats */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-cgi-muted-foreground uppercase tracking-wider">💰 Pénzügyi</p>
                <div className="space-y-1">
                  <p className="text-sm text-cgi-surface-foreground">
                    <span className="font-medium">{data.points.total_spend.toLocaleString("hu-HU")}</span> Ft költés
                  </p>
                  <p className="text-sm text-cgi-surface-foreground">
                    <span className="font-medium">{data.scores.roi.toFixed(1)}x</span> ROI
                  </p>
                  <p className="text-sm text-cgi-surface-foreground">
                    <span className="font-medium">{data.scores.ltv.toLocaleString("hu-HU")}</span> Ft LTV
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-cgi-muted-foreground uppercase tracking-wider">🎯 Státusz</p>
                <div className="space-y-1">
                  <p className="text-sm text-cgi-surface-foreground flex items-center gap-1">
                    {data.scores.engagement_score >= 50 ? (
                      <span className="text-green-400">🟢</span>
                    ) : data.scores.engagement_score >= 25 ? (
                      <span className="text-yellow-400">🟡</span>
                    ) : (
                      <span className="text-red-400">🔴</span>
                    )}
                    {data.scores.engagement_score}% engagement
                  </p>
                  {getChurnBadge(data.scores.churn_risk)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Today's Status */}
            <div>
              <p className="text-sm font-medium text-cgi-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Mai állapot
              </p>
              <div className="space-y-2">
                {data.venue_affinity.slice(0, 3).map((venue) => (
                  <div
                    key={venue.venue_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-cgi-muted/20"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cgi-muted-foreground" />
                      <span className="text-sm text-cgi-surface-foreground">{venue.venue_name}</span>
                    </div>
                    {venue.today_redemption?.redeemed ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400">
                          {venue.today_redemption.redeemed_at && format(new Date(venue.today_redemption.redeemed_at), "HH:mm")}
                          {venue.today_redemption.drink_name && ` (${venue.today_redemption.drink_name})`}
                        </span>
                      </div>
                    ) : venue.next_window ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span className="text-xs text-yellow-400">
                          {venue.next_window.start}-{venue.next_window.end}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-cgi-muted-foreground">Nincs ablak ma</span>
                    )}
                  </div>
                ))}
                {data.venue_affinity.length === 0 && (
                  <p className="text-sm text-cgi-muted-foreground text-center py-2">
                    Nincs helyszín adat
                  </p>
                )}
              </div>
            </div>

            {/* Top Drinks */}
            {data.drink_preferences.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-cgi-muted-foreground mb-3 flex items-center gap-2">
                    <Beer className="h-4 w-4" />
                    Top italok
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.drink_preferences.slice(0, 5).map((drink, index) => (
                      <Badge
                        key={drink.drink_name}
                        variant="outline"
                        className="bg-cgi-muted/20"
                      >
                        {index + 1}. {drink.drink_name} ({drink.count}×)
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleViewProfile}
                className="flex-1 bg-cgi-primary hover:bg-cgi-primary/90"
              >
                <User className="h-4 w-4 mr-2" />
                Teljes profil
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowNotificationModal(true)}
              >
                <Bell className="h-4 w-4 mr-2" />
                Push küldése
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowBonusModal(true)}
              >
                <Award className="h-4 w-4 mr-2" />
                Jutalom
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>

      {/* Sub-modals */}
      {data && (
        <>
          <ManualNotificationModal
            userId={data.user.id}
            userName={data.user.name}
            open={showNotificationModal}
            onOpenChange={setShowNotificationModal}
          />
          <SingleBonusPointsModal
            userId={data.user.id}
            userName={data.user.name}
            open={showBonusModal}
            onOpenChange={setShowBonusModal}
          />
        </>
      )}
    </Dialog>
  );
}
