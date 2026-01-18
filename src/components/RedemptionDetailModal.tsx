import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Wine, MapPin, User, Clock, AlertTriangle, CheckCircle } from "lucide-react";

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
  drink_details?: { drink_name: string; image_url?: string };
  token_info?: { token_prefix: string };
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

  const truncateUserId = (userId: string) => {
    return userId.substring(0, 8) + "...";
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-cgi-primary" />
            Beváltás részletei
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

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground">Azonosító</p>
              <p className="font-mono text-sm">{redemption.id.substring(0, 8)}...</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground">Időpont</p>
              <p className="text-sm flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(redemption.redeemed_at)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground">Helyszín</p>
              <p className="text-sm flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {redemption.venue?.name || "Ismeretlen"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground">Ital</p>
              <p className="text-sm flex items-center gap-1">
                <Wine className="h-3 w-3" />
                {redemption.drink_details?.drink_name || redemption.drink}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground">Felhasználó</p>
              <p className="text-sm flex items-center gap-1">
                <User className="h-3 w-3" />
                {truncateUserId(redemption.user_id)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-cgi-muted-foreground">Érték</p>
              <p className="text-sm font-medium text-cgi-secondary">
                {formatCurrency(redemption.value)}
              </p>
            </div>

            {redemption.token_info?.token_prefix && (
              <div className="space-y-1">
                <p className="text-sm text-cgi-muted-foreground">Token</p>
                <p className="font-mono text-sm">{redemption.token_info.token_prefix}</p>
              </div>
            )}

            {redemption.staff_id && (
              <div className="space-y-1">
                <p className="text-sm text-cgi-muted-foreground">Személyzet</p>
                <p className="font-mono text-sm">{truncateUserId(redemption.staff_id)}</p>
              </div>
            )}
          </div>

          {/* Void Information */}
          {redemption.status === "void" && redemption.metadata && (
            <div className="border-t border-cgi-border pt-4 mt-4">
              <h4 className="font-medium mb-2 text-red-400">Visszavonás adatai</h4>
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
                    <p className="font-mono">{truncateUserId(redemption.metadata.voided_by)}</p>
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
