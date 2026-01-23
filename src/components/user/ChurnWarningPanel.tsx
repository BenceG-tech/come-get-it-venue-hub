import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, Gift, Mail, Bell } from "lucide-react";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { toast } from "sonner";

interface ChurnWarningPanelProps {
  churnRisk: "low" | "medium" | "high";
  churnFactors: string[];
  daysSinceLastActivity: number | null;
  onSendOffer?: () => void;
  onSendEmail?: () => void;
  onSendPush?: () => void;
}

export function ChurnWarningPanel({
  churnRisk,
  churnFactors,
  daysSinceLastActivity,
  onSendOffer,
  onSendEmail,
  onSendPush
}: ChurnWarningPanelProps) {
  const getRiskConfig = () => {
    switch (churnRisk) {
      case "high":
        return {
          icon: XCircle,
          color: "text-cgi-error",
          bgColor: "bg-cgi-error/10",
          borderColor: "border-cgi-error/30",
          badgeClass: "bg-cgi-error/20 text-cgi-error border-cgi-error/30",
          label: "MAGAS KOCKÁZAT",
          description: "Azonnali beavatkozás szükséges!"
        };
      case "medium":
        return {
          icon: AlertTriangle,
          color: "text-cgi-warning",
          bgColor: "bg-cgi-warning/10",
          borderColor: "border-cgi-warning/30",
          badgeClass: "bg-cgi-warning/20 text-cgi-warning border-cgi-warning/30",
          label: "KÖZEPES KOCKÁZAT",
          description: "Figyelj rá!"
        };
      default:
        return {
          icon: CheckCircle,
          color: "text-cgi-success",
          bgColor: "bg-cgi-success/10",
          borderColor: "border-cgi-success/30",
          badgeClass: "bg-cgi-success/20 text-cgi-success border-cgi-success/30",
          label: "ALACSONY KOCKÁZAT",
          description: "A felhasználó aktív és elkötelezett."
        };
    }
  };

  const config = getRiskConfig();
  const Icon = config.icon;

  const handleSendOffer = () => {
    if (onSendOffer) {
      onSendOffer();
      toast.info("Navigálás az AI ajánlatokhoz...");
    }
  };

  const handleSendEmail = () => {
    if (onSendEmail) {
      onSendEmail();
    } else {
      toast.info("Email kampány funkció hamarosan elérhető!");
    }
  };

  const handleSendPush = () => {
    if (onSendPush) {
      onSendPush();
      toast.info("Navigálás az értesítésekhez...");
    }
  };

  // Only show detailed panel for medium/high risk
  if (churnRisk === "low") {
    return (
      <div className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div>
            <Badge className={config.badgeClass}>{config.label}</Badge>
            <p className="text-sm text-cgi-muted-foreground mt-1">{config.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`${config.bgColor} border ${config.borderColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <span className={config.color}>Korai figyelmeztetés</span>
          <Badge className={config.badgeClass}>{config.label}</Badge>
          <InfoTooltip content="A lemorzsolódási kockázat az aktivitási minták alapján kerül kiszámításra. Magas kockázat esetén azonnali visszaszerző kampány javasolt." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Risk description */}
          <p className="text-sm text-cgi-surface-foreground font-medium">
            {config.description}
          </p>

          {/* Churn factors */}
          {churnFactors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-cgi-muted-foreground">Miért?</p>
              <ul className="space-y-1">
                {churnFactors.map((factor, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-cgi-surface-foreground">
                    <span className="text-cgi-muted-foreground">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Days since last activity */}
          {daysSinceLastActivity !== null && daysSinceLastActivity > 7 && (
            <div className="p-3 rounded-lg bg-cgi-surface/50 border border-cgi-muted/30">
              <p className="text-sm">
                <span className="text-cgi-muted-foreground">Utolsó aktivitás óta: </span>
                <span className={`font-semibold ${daysSinceLastActivity > 14 ? "text-cgi-error" : "text-cgi-warning"}`}>
                  {daysSinceLastActivity} nap
                </span>
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2">
            <p className="text-sm font-medium text-cgi-muted-foreground mb-3">Javasolt akciók:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-cgi-primary text-cgi-primary hover:bg-cgi-primary/10"
                onClick={handleSendOffer}
              >
                <Gift className="h-4 w-4 mr-2" />
                Személyes ajánlat
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-cgi-secondary text-cgi-secondary hover:bg-cgi-secondary/10"
                onClick={handleSendEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email kampány
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-cgi-accent text-cgi-accent hover:bg-cgi-accent/10"
                onClick={handleSendPush}
              >
                <Bell className="h-4 w-4 mr-2" />
                Push értesítés
              </Button>
            </div>
          </div>

          {/* Tips based on risk level */}
          {churnRisk === "high" && (
            <div className="mt-4 p-3 rounded-lg bg-cgi-error/5 border border-cgi-error/20">
              <p className="text-xs text-cgi-muted-foreground">
                💡 <strong>Tipp:</strong> Magas kockázatú felhasználóknál a személyre szabott, értékes ajánlatok 40%-kal hatékonyabbak a visszaszerzésben.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
