import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { Info, X, ChevronDown, ChevronUp, Beer, BarChart3, Trophy } from "lucide-react";

interface SystemRulesPanelProps {
  className?: string;
}

function RulesContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="space-y-6">
      {/* Free Drink Rules */}
      <div>
        <h4 className="font-semibold text-cgi-secondary flex items-center gap-2 mb-3">
          <Beer className="h-4 w-4" />
          INGYEN ITAL SZABÁLYOK
        </h4>
        <ul className="space-y-2 text-sm text-cgi-surface-foreground">
          <li className="flex items-start gap-2">
            <span className="text-cgi-primary shrink-0">•</span>
            <span>Egy felhasználó <strong>naponta 1 ingyen italt</strong> válthat be helyszínenként</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cgi-primary shrink-0">•</span>
            <span>Az ingyen ital csak az <strong>aktív időablakokban</strong> érhető el (pl. 14:00-16:00)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cgi-primary shrink-0">•</span>
            <span><strong>5 perc</strong> várakozás szükséges két token kérés között</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cgi-primary shrink-0">•</span>
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
              Összetevők: beváltások (40%), visszatérési gyakoriság (30%), app használat (30%). 75+ = kiváló.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-cgi-muted/20">
            <p className="font-medium text-cgi-primary">LTV - Élettartam Érték</p>
            <p className="text-cgi-muted-foreground mt-1">
              Becsült összérték Ft-ban: eddigi + jövőbeli költés az aktivitás alapján.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-cgi-muted/20">
            <p className="font-medium text-cgi-primary">ROI - Megtérülési ráta</p>
            <p className="text-cgi-muted-foreground mt-1">
              Költés / Ingyen italok értéke. 2.0x+ = nyereséges felhasználó.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-cgi-muted/20">
            <p className="font-medium text-cgi-primary">Churn Risk</p>
            <p className="text-cgi-muted-foreground mt-1">
              <span className="text-cgi-success">Alacsony</span> (14 napon belül), 
              <span className="text-amber-400 ml-1">Közepes</span> (14-30 nap), 
              <span className="text-cgi-error ml-1">Magas</span> (30+ nap inaktív).
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
        <div className="grid grid-cols-1 gap-3 text-sm">
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
    </div>
  );
}

export function SystemRulesPanel({ className }: SystemRulesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile: Use Sheet (bottom drawer)
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-cgi-muted/30 border-cgi-muted hover:bg-cgi-muted/50"
          >
            <Info className="h-4 w-4 text-cgi-primary" />
            Szabályok
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-cgi-surface-foreground">
              <Info className="h-5 w-5 text-cgi-primary" />
              Rendszer szabályok
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-80px)] pr-4">
            <RulesContent onClose={() => setIsOpen(false)} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Collapsible
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
          <CardContent>
            <RulesContent />
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
