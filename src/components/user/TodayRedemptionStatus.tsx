import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { Check, Clock, X, Beer } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface TodayRedemptionData {
  redeemed: boolean;
  redeemed_at?: string;
  drink_name?: string;
  next_window?: { start: string; end: string } | null;
}

interface TodayRedemptionStatusProps {
  data: TodayRedemptionData;
  venueName: string;
  className?: string;
}

export function TodayRedemptionStatus({ data, venueName, className }: TodayRedemptionStatusProps) {
  if (data.redeemed && data.redeemed_at) {
    // Already redeemed today
    const redeemTime = format(new Date(data.redeemed_at), "HH:mm", { locale: hu });
    
    return (
      <div className={`p-3 rounded-lg bg-cgi-success/10 border border-cgi-success/30 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-cgi-success/20 flex items-center justify-center flex-shrink-0">
            <Check className="h-4 w-4 text-cgi-success" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-cgi-success">Ma már beváltott</p>
              <InfoTooltip content={`A felhasználó naponta 1 ingyen italt válthat be helyszínenként. Itt (${venueName}) ma már élt ezzel a lehetőséggel.`} />
            </div>
            <p className="text-sm text-cgi-surface-foreground">
              <span className="text-cgi-muted-foreground">{redeemTime}-kor:</span>{" "}
              <span className="font-medium">{data.drink_name || "Ingyen ital"}</span>
            </p>
            <p className="text-xs text-cgi-muted-foreground mt-1 flex items-center gap-1">
              <X className="h-3 w-3" />
              Következő lehetőség: holnap
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not yet redeemed today
  return (
    <div className={`p-3 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-cgi-muted/40 flex items-center justify-center flex-shrink-0">
          <Beer className="h-4 w-4 text-cgi-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-cgi-surface-foreground">Ma még nem váltott be</p>
            <InfoTooltip content={`A felhasználó naponta 1 ingyen italt válthat be helyszínenként. Itt (${venueName}) ma még nem használta fel.`} />
          </div>
          
          {data.next_window ? (
            <p className="text-sm text-cgi-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Következő ablak: <span className="text-cgi-primary font-medium">{data.next_window.start} - {data.next_window.end}</span>
            </p>
          ) : (
            <p className="text-sm text-cgi-muted-foreground">
              Ellenőrizze a helyszín nyitvatartását
            </p>
          )}
          
          <Badge variant="outline" className="mt-2 text-xs">
            Elérhető: 1 ingyen ital
          </Badge>
        </div>
      </div>
    </div>
  );
}
