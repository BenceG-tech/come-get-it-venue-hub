import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserScorecardProps {
  engagementScore: number;
  churnRisk: "low" | "medium" | "high";
  ltv: number;
  preferenceProfile: string[];
}

export function UserScorecard({ engagementScore, churnRisk, ltv, preferenceProfile }: UserScorecardProps) {
  const getChurnRiskColor = () => {
    switch (churnRisk) {
      case "low": return "bg-cgi-success/20 text-cgi-success border-cgi-success/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "high": return "bg-cgi-error/20 text-cgi-error border-cgi-error/30";
    }
  };

  const getChurnRiskLabel = () => {
    switch (churnRisk) {
      case "low": return "Alacsony";
      case "medium": return "Közepes";
      case "high": return "Magas";
    }
  };

  const getEngagementColor = () => {
    if (engagementScore >= 75) return "text-cgi-success";
    if (engagementScore >= 50) return "text-cgi-secondary";
    if (engagementScore >= 25) return "text-amber-400";
    return "text-cgi-error";
  };

  const getEngagementIcon = () => {
    if (engagementScore >= 50) return <TrendingUp className="h-5 w-5 text-cgi-success" />;
    return <TrendingDown className="h-5 w-5 text-cgi-error" />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Engagement Score */}
      <Card className="cgi-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-cgi-muted-foreground">Engagement Score</span>
              <InfoTooltip content="A felhasználó aktivitási szintje 0-100 skálán, beváltások, visszatérések és app használat alapján számítva." />
            </div>
            {getEngagementIcon()}
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className={cn("text-4xl font-bold", getEngagementColor())}>
              {engagementScore}
            </span>
            <span className="text-cgi-muted-foreground text-sm mb-1">/100</span>
          </div>
          <Progress value={engagementScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Churn Risk */}
      <Card className="cgi-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-cgi-muted-foreground">Lemorzsolódási kockázat</span>
              <InfoTooltip content="A lemorzsolódási kockázat becslése az utolsó aktivitás és viselkedési minták alapján. 14+ nap inaktivitás közepes, 30+ nap magas kockázatot jelent." />
            </div>
            <AlertTriangle className={cn(
              "h-5 w-5",
              churnRisk === "high" ? "text-cgi-error" : 
              churnRisk === "medium" ? "text-amber-400" : "text-cgi-success"
            )} />
          </div>
          <Badge className={cn("text-lg px-3 py-1", getChurnRiskColor())}>
            {getChurnRiskLabel()}
          </Badge>
          <p className="text-xs text-cgi-muted-foreground mt-2">
            {churnRisk === "high" 
              ? "30+ napja inaktív" 
              : churnRisk === "medium" 
              ? "14-30 napja inaktív" 
              : "Aktív az elmúlt 14 napban"}
          </p>
        </CardContent>
      </Card>

      {/* LTV */}
      <Card className="cgi-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-cgi-muted-foreground">Élettartam Érték (LTV)</span>
              <InfoTooltip content="A felhasználó becsült élettartam értéke (Lifetime Value) az eddigi és várható költések alapján számolva." />
            </div>
            <Zap className="h-5 w-5 text-cgi-secondary" />
          </div>
          <p className="text-3xl font-bold text-cgi-surface-foreground">
            {ltv.toLocaleString("hu-HU")} <span className="text-lg">Ft</span>
          </p>
          <p className="text-xs text-cgi-muted-foreground mt-2">
            Becsült összes érték
          </p>
        </CardContent>
      </Card>

      {/* Preference Profile */}
      <Card className="cgi-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-cgi-muted-foreground">Profil címkék</span>
              <InfoTooltip content="Automatikusan generált címkék a felhasználó viselkedése alapján: kedvenc italok, látogatási szokások, lojalitás." />
            </div>
            <Star className="h-5 w-5 text-cgi-primary" />
          </div>
          <div className="flex flex-wrap gap-2">
            {preferenceProfile.length > 0 ? (
              preferenceProfile.map((tag, i) => (
                <Badge 
                  key={i} 
                  variant="outline"
                  className="bg-cgi-primary/10 text-cgi-primary border-cgi-primary/30"
                >
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-cgi-muted-foreground text-sm">Nincs elég adat</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
