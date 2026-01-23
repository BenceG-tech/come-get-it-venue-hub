import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Wine, MapPin, User, Clock, AlertTriangle, CheckCircle, CreditCard, CalendarDays, TrendingUp } from "lucide-react";
import { UserLink, VenueLink, DrinkLink } from "@/components/ui/entity-links";
import { RedemptionContextBadges } from "@/components/RedemptionContextBadges";
import { MobileTooltip, InfoTooltip } from "@/components/ui/mobile-tooltip";

interface RedemptionMetadata {
  voided_at?: string;
  voided_by?: string;
  void_reason?: string;
}

export interface RedemptionRecord {
  id: string;
  redeemed_at: string;
  drink: string;
  drink_id?: string;
  user_id: string;
  venue_id: string;
  value: number;
  status: "success" | "void" | "cancelled";
  staff_id?: string;
  token_id?: string;
  metadata?: RedemptionMetadata;
  venue?: { id: string; name: string };
  user_profile?: { id: string; name: string | null; avatar_url: string | null };
  drink_details?: { drink_name: string; image_url?: string };
  token_info?: { token_prefix: string };
  visits_total?: number;
  visits_this_week?: number;
  visits_this_month?: number;
}

interface RedemptionDetailModalProps {
  redemption: RedemptionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedemptionDetailModal({
  redemption,
  open,
  onOpenChange,
}: RedemptionDetailModalProps) {
  if (!redemption) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "yyyy. MMMM d. HH:mm:ss", { locale: hu });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const truncateId = (id: string) => {
    return id.substring(0, 8) + "...";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Sikeres</Badge>;
      case "void":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Visszavont</Badge>;
      case "cancelled":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Törölve</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-cgi-primary" />
            Beváltás részletei
            <InfoTooltip content="A beváltás teljes részletei a felhasználó, helyszín és ital információkkal" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            redemption.status === "success" 
              ? "bg-green-500/10 border border-green-500/20"
              : redemption.status === "void"
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-yellow-500/10 border border-yellow-500/20"
          }`}>
            {redemption.status === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <div className="font-medium">{getStatusBadge(redemption.status)}</div>
              {redemption.status === "void" && redemption.metadata?.void_reason && (
                <p className="text-sm text-cgi-muted-foreground mt-1">
                  Indok: {redemption.metadata.void_reason}
                </p>
              )}
            </div>
          </div>

          {/* Visit Context */}
          {(redemption.visits_total || redemption.visits_this_week) && (
            <div className="p-3 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30">
              <p className="text-xs font-medium text-cgi-muted-foreground mb-2 flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Látogatási kontextus
                <InfoTooltip content="Hányadik alkalommal váltott be ez a felhasználó ezen a helyszínen" iconClassName="h-3 w-3" />
              </p>
              <RedemptionContextBadges
                visitsThisWeek={redemption.visits_this_week}
                visitsThisMonth={redemption.visits_this_month}
                visitsTotal={redemption.visits_total}
                showMilestones={true}
              />
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                Azonosító
                <InfoTooltip content="A beváltás egyedi azonosítója" iconClassName="h-3 w-3" />
              </p>
              <p className="font-mono text-sm">{truncateId(redemption.id)}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Időpont
              </p>
              <p className="text-sm">{formatDate(redemption.redeemed_at)}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                Felhasználó
              </p>
              <UserLink
                userId={redemption.user_id}
                userName={redemption.user_profile?.name || "Vendég"}
                avatarUrl={redemption.user_profile?.avatar_url || undefined}
                showAvatar={true}
                size="sm"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Helyszín
              </p>
              <VenueLink
                venueId={redemption.venue_id}
                venueName={redemption.venue?.name || "Ismeretlen"}
                size="sm"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                <Wine className="h-3 w-3" />
                Ital
              </p>
              <DrinkLink
                drinkId={redemption.drink_id}
                drinkName={redemption.drink_details?.drink_name || redemption.drink}
                size="sm"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Érték
                <InfoTooltip content="Az ingyenes ital számított értéke" iconClassName="h-3 w-3" />
              </p>
              <p className="text-sm font-medium text-cgi-secondary">
                {formatCurrency(redemption.value)}
              </p>
            </div>

            {redemption.token_info?.token_prefix && (
              <div className="space-y-1">
                <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                  Token
                  <InfoTooltip content="A beváltáshoz használt QR kód token" iconClassName="h-3 w-3" />
                </p>
                <p className="font-mono text-sm">{redemption.token_info.token_prefix}</p>
              </div>
            )}

            {redemption.staff_id && (
              <div className="space-y-1">
                <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
                  Személyzet
                  <InfoTooltip content="A beváltást jóváhagyó személyzet azonosítója" iconClassName="h-3 w-3" />
                </p>
                <p className="font-mono text-sm">{truncateId(redemption.staff_id)}</p>
              </div>
            )}
          </div>

          {/* Void Information */}
          {redemption.status === "void" && redemption.metadata && (
            <div className="border-t border-cgi-border pt-4 mt-4">
              <h4 className="font-medium mb-2 text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Visszavonás adatai
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {redemption.metadata.voided_at && (
                  <div>
                    <p className="text-cgi-muted-foreground">Visszavonva</p>
                    <p>{formatDate(redemption.metadata.voided_at)}</p>
                  </div>
                )}
                {redemption.metadata.voided_by && (
                  <div>
                    <p className="text-cgi-muted-foreground">Visszavonta</p>
                    <p className="font-mono">{truncateId(redemption.metadata.voided_by)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
