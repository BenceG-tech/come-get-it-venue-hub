import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  MapPin,
  Clock,
  Bell,
  Award,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Beer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
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

  const isMobile = useIsMobile();

  const body = (
    <>
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-2" />
          <p>Hiba történt az adatok betöltése közben</p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Profile Header — compact */}
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={data.user.avatar_url || undefined} />
              <AvatarFallback className="bg-cgi-secondary/20 text-cgi-secondary">
                {getInitials(data.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-cgi-surface-foreground truncate">
                  {data.user.name}
                </h3>
                {getChurnBadge(data.scores.churn_risk)}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-cgi-muted-foreground">
                {data.user.email && (
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{data.user.email}</span>
                  </span>
                )}
                {data.user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {data.user.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {data.stats.days_since_registration} napja
                </span>
              </div>
            </div>
          </div>

          {/* KPI Grid — compact 2x3 on mobile, 3x2 on desktop */}
          <div className="grid grid-cols-3 gap-2">
            <KpiTile label="Beváltás" value={data.stats.total_free_drink_redemptions} />
            <KpiTile label="Pont" value={data.points.balance} />
            <KpiTile label="Helyszín" value={data.venue_affinity.length} />
            <KpiTile label="Költés" value={`${data.points.total_spend.toLocaleString("hu-HU")} Ft`} small />
            <KpiTile label="ROI" value={`${data.scores.roi.toFixed(1)}x`} />
            <KpiTile
              label="Engagement"
              value={`${data.scores.engagement_score}%`}
              tone={
                data.scores.engagement_score >= 50
                  ? "green"
                  : data.scores.engagement_score >= 25
                    ? "yellow"
                    : "red"
              }
            />
          </div>

          {/* Today's Status */}
          <div>
            <p className="text-xs font-medium text-cgi-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Mai állapot
            </p>
            <div className="space-y-1.5">
              {data.venue_affinity.slice(0, 3).map((venue) => (
                <div
                  key={venue.venue_id}
                  className="flex items-center justify-between p-2 rounded-md bg-cgi-muted/20"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-cgi-muted-foreground shrink-0" />
                    <span className="text-xs text-cgi-surface-foreground truncate">
                      {venue.venue_name}
                    </span>
                  </div>
                  {venue.today_redemption?.redeemed ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-[11px] text-green-400">
                        {venue.today_redemption.redeemed_at &&
                          format(new Date(venue.today_redemption.redeemed_at), "HH:mm")}
                      </span>
                    </div>
                  ) : venue.next_window ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-[11px] text-yellow-400">
                        {venue.next_window.start}–{venue.next_window.end}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-cgi-muted-foreground shrink-0">
                      Nincs ma
                    </span>
                  )}
                </div>
              ))}
              {data.venue_affinity.length === 0 && (
                <p className="text-xs text-cgi-muted-foreground text-center py-2">
                  Nincs helyszín adat
                </p>
              )}
            </div>
          </div>

          {/* Top Drinks */}
          {data.drink_preferences.length > 0 && (
            <div>
              <p className="text-xs font-medium text-cgi-muted-foreground mb-2 flex items-center gap-1.5">
                <Beer className="h-3.5 w-3.5" />
                Top italok
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.drink_preferences.slice(0, 5).map((drink, index) => (
                  <Badge
                    key={drink.drink_name}
                    variant="outline"
                    className="bg-cgi-muted/20 text-[11px] py-0.5 px-2"
                  >
                    {index + 1}. {drink.drink_name} ({drink.count}×)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  );

  const actions = data ? (
    <div className="flex gap-2 pt-2">
      <Button
        onClick={handleViewProfile}
        size="sm"
        className="flex-1 bg-cgi-primary hover:bg-cgi-primary/90 h-9"
      >
        <User className="h-3.5 w-3.5 mr-1" />
        Profil
        <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 h-9"
        onClick={() => setShowNotificationModal(true)}
      >
        <Bell className="h-3.5 w-3.5 mr-1" />
        Push
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 h-9"
        onClick={() => setShowBonusModal(true)}
      >
        <Award className="h-3.5 w-3.5 mr-1" />
        Jutalom
      </Button>
    </div>
  ) : null;

  const subModals = data ? (
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
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92vh] flex flex-col p-0 rounded-t-xl"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-cgi-muted/30">
            <SheetTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-cgi-primary" />
              Felhasználó gyorsnézet
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3">{body}</div>
          {actions && (
            <div className="px-4 pb-4 pt-2 border-t border-cgi-muted/30 bg-cgi-background">
              {actions}
            </div>
          )}
        </SheetContent>
        {subModals}
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-cgi-primary" />
            Felhasználó gyorsnézet
          </DialogTitle>
        </DialogHeader>
        {body}
        {actions}
      </DialogContent>
      {subModals}
    </Dialog>
  );
}

function KpiTile({
  label,
  value,
  small,
  tone,
}: {
  label: string;
  value: string | number;
  small?: boolean;
  tone?: "green" | "yellow" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-400"
      : tone === "yellow"
        ? "text-yellow-400"
        : tone === "red"
          ? "text-red-400"
          : "text-cgi-surface-foreground";
  return (
    <div className="rounded-md bg-cgi-muted/15 border border-cgi-muted/20 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-cgi-muted-foreground truncate">
        {label}
      </p>
      <p className={`font-semibold leading-tight ${small ? "text-xs" : "text-sm"} ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

