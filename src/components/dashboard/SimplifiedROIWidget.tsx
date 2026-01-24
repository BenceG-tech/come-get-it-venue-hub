import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowUpRight, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface SimplifiedROIWidgetProps {
  venueId: string;
  startDate?: Date;
  endDate?: Date;
}

interface ROIData {
  total_spend: number;
  redemption_count: number;
  match_rate: number;
  estimated_free_drink_cost: number;
  matched_revenue: number;
  roi_multiplier: number;
}

export function SimplifiedROIWidget({ venueId, startDate, endDate }: SimplifiedROIWidgetProps) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const { data, isLoading, error } = useQuery({
    queryKey: ["simplified-roi", venueId, start.toISOString(), end.toISOString()],
    queryFn: async (): Promise<ROIData> => {
      // Get redemptions count for this venue
      const { count: redemptionCount, error: redemptionError } = await supabase
        .from("redemptions")
        .select("*", { count: "exact", head: true })
        .eq("venue_id", venueId)
        .gte("redeemed_at", start.toISOString())
        .lte("redeemed_at", end.toISOString());

      if (redemptionError) throw redemptionError;

      // Get matched transactions for Salt Edge
      const { data: matches, error: matchError } = await supabase
        .from("redemption_transaction_matches")
        .select("id, match_confidence, saltedge_transaction_id")
        .not("saltedge_transaction_id", "is", null);

      if (matchError) throw matchError;

      // Get Salt Edge transactions for this venue
      const { data: seTxs, error: seTxError } = await supabase
        .from("saltedge_transactions")
        .select("id, amount")
        .eq("matched_venue_id", venueId)
        .gte("made_on", start.toISOString().split('T')[0])
        .lte("made_on", end.toISOString().split('T')[0]);

      let totalSpend = 0;
      if (!seTxError && seTxs) {
        totalSpend = seTxs.reduce((sum, tx) => sum + ((tx as any).amount || 0), 0);
      }

      // Calculate metrics
      const redemptions = redemptionCount || 0;
      const matchedCount = matches?.filter(m => m.saltedge_transaction_id).length || 0;
      const matchRate = redemptions > 0 ? (matchedCount / redemptions) * 100 : 0;
      const estimatedFreeDrinkCost = redemptions * 500; // Assume 500 HUF avg per free drink
      const matchedRevenue = totalSpend;
      const roi = estimatedFreeDrinkCost > 0 
        ? matchedRevenue / estimatedFreeDrinkCost 
        : 0;

      return {
        total_spend: totalSpend,
        redemption_count: redemptions,
        match_rate: matchRate,
        estimated_free_drink_cost: estimatedFreeDrinkCost,
        matched_revenue: matchedRevenue,
        roi_multiplier: roi,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      maximumFractionDigits: 0,
    }).format(amount / 100); // Convert from fillér
  };

  if (isLoading) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="cgi-card border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Hiba történt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nem sikerült betölteni az ROI adatokat.</p>
        </CardContent>
      </Card>
    );
  }

  const roiPercentage = Math.min((data?.roi_multiplier || 0) / 5 * 100, 100);

  return (
    <Card className="cgi-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-cgi-secondary" />
              Költési Statisztika
            </CardTitle>
            <CardDescription>
              Banki tranzakciók alapján (elmúlt 30 nap)
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground">
            Salt Edge
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(data?.total_spend || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Össz költés</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-foreground">
              {data?.redemption_count || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Beváltások</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-foreground">
              {Math.round(data?.match_rate || 0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">Match Rate</div>
          </div>
        </div>

        {/* ROI Progress */}
        <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">ROI Becslés</span>
            <span className="text-lg font-bold text-cgi-secondary">
              {data?.roi_multiplier?.toFixed(1) || "0.0"}x
            </span>
          </div>
          <Progress value={roiPercentage} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Free drink költség: {formatCurrency(data?.estimated_free_drink_cost || 0)}</span>
            <span>Generált bevétel: {formatCurrency(data?.matched_revenue || 0)}</span>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-cgi-secondary/10 to-cgi-accent/10 border border-cgi-secondary/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-cgi-secondary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Részletesebb elemzéshez
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                A Goorderz integráció SKU-szintű adatokat biztosít, így láthatod, 
                mit rendelnek a vendégek az ingyen ital után (First Glass hatás).
              </p>
              <Link to="/settings">
                <Button 
                  variant="link" 
                  size="sm" 
                  className="mt-2 p-0 h-auto text-cgi-secondary"
                >
                  Tudj meg többet
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
