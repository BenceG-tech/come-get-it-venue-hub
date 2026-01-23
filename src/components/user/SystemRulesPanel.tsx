import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Info, X, ChevronDown, ChevronUp, Beer, BarChart3, Trophy } from "lucide-react";

interface SystemRulesPanelProps {
  className?: string;
}

export function SystemRulesPanel({ className }: SystemRulesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-cgi-muted/30 border-cgi-muted hover:bg-cgi-muted/50"
        >
          <Info className="h-4 w-4 text-cgi-primary" />
          Szabályok
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4">
        <Card className="cgi-card border-cgi-primary/30 bg-cgi-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-cgi-surface-foreground flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-cgi-primary" />
                Rendszer szabályok és metrikák
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Free Drink Rules */}
            <div>
              <h4 className="font-semibold text-cgi-secondary flex items-center gap-2 mb-3">
                <Beer className="h-4 w-4" />
                INGYEN ITAL SZABÁLYOK
              </h4>
              <ul className="space-y-2 text-sm text-cgi-surface-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-cgi-primary">•</span>
                  <span>Egy felhasználó <strong>naponta 1 ingyen italt</strong> válthat be helyszínenként</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cgi-primary">•</span>
                  <span>Az ingyen ital csak az <strong>aktív időablakokban</strong> érhető el (pl. 14:00-16:00)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cgi-primary">•</span>
                  <span><strong>5 perc</strong> várakozás szükséges két token kérés között</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cgi-primary">•</span>
                  <span>A QR kód <strong>10 percig</strong> érvényes a generálás után</span>
                </li>
              </ul>
            </div>

            {/* Metrics Explanation */}
            <div>
              <h4 className="font-semibold text-cgi-secondary flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4" />
                METRIKÁK MAGYARÁZATA
              </h4>
              <div className="space-y-3 text-sm text-cgi-surface-foreground">
                <div className="p-3 rounded-lg bg-cgi-muted/20">
                  <p className="font-medium text-cgi-primary">Engagement Score (0-100)</p>
                  <p className="text-cgi-muted-foreground mt-1">
                    Az aktivitási szint mérőszáma. Összetevők: beváltások száma (40%), visszatérési gyakoriság (30%), app használat (30%). 75+ = kiváló, 50-74 = átlagos, {"<50"} = fejlesztendő.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-cgi-muted/20">
                  <p className="font-medium text-cgi-primary">LTV - Élettartam Érték</p>
                  <p className="text-cgi-muted-foreground mt-1">
                    A felhasználó becsült összértéke Ft-ban. Számítás: (Eddigi költés) + (Becsült jövőbeli költés az aktivitás alapján). Magasabb = értékesebb ügyfél.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-cgi-muted/20">
                  <p className="font-medium text-cgi-primary">ROI - Megtérülési ráta</p>
                  <p className="text-cgi-muted-foreground mt-1">
                    Tényleges költés / Ingyen italok értéke. Pl. ROI 3.0x = minden 1.000 Ft ingyen italra 3.000 Ft költés jut. 2.0x+ = nyereséges.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-cgi-muted/20">
                  <p className="font-medium text-cgi-primary">Churn Risk - Lemorzsolódási kockázat</p>
                  <p className="text-cgi-muted-foreground mt-1">
                    Az utolsó aktivitás alapján: <strong className="text-cgi-success">Alacsony</strong> (aktív 14 napon belül), <strong className="text-amber-400">Közepes</strong> (14-30 nap inaktív), <strong className="text-cgi-error">Magas</strong> (30+ nap inaktív).
                  </p>
                </div>
              </div>
            </div>

            {/* Loyalty Milestones */}
            <div>
              <h4 className="font-semibold text-cgi-secondary flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4" />
                LOJALITÁS MÉRFÖLDKÖVEK
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="font-medium text-amber-400">🔥 Heti VIP</p>
                  <p className="text-cgi-muted-foreground mt-1">5+ látogatás / hét ugyanazon a helyszínen</p>
                </div>
                <div className="p-3 rounded-lg bg-cgi-secondary/10 border border-cgi-secondary/30">
                  <p className="font-medium text-cgi-secondary">⭐ Havi VIP</p>
                  <p className="text-cgi-muted-foreground mt-1">10+ látogatás / hónap ugyanazon a helyszínen</p>
                </div>
                <div className="p-3 rounded-lg bg-cgi-primary/10 border border-cgi-primary/30">
                  <p className="font-medium text-cgi-primary">💎 Platina tag</p>
                  <p className="text-cgi-muted-foreground mt-1">50+ összesített látogatás egy helyszínen</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
