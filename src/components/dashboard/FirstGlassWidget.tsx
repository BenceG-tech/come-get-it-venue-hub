import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wine, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  HelpCircle,
  Zap,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FirstGlassAnalytics {
  total_free_drinks: number;
  total_matched_transactions: number;
  match_rate: number;
  average_subsequent_spend: number;
  top_second_orders: Array<{
    category: string;
    count: number;
    avg_price: number;
  }>;
  upsell_rate: number;
  avg_time_to_second_order: number;
  total_additional_revenue: number;
  roi_multiplier: number;
  free_drink_cost_estimate: number;
}

interface FirstGlassWidgetProps {
  venueId: string;
  startDate?: Date;
  endDate?: Date;
}

export function FirstGlassWidget({ venueId, startDate, endDate }: FirstGlassWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['first-glass-analytics', venueId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-first-glass-analytics', {
        body: {
          venue_id: venueId,
          start_date: startDate?.toISOString(),
          end_date: endDate?.toISOString(),
        },
      });

      if (error) throw error;
      return data as FirstGlassAnalytics | { available: false; integration_type: string };
    },
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="cgi-card border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Hiba az adatok betöltésekor</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if analytics is not available (non-Goorderz venue)
  if (data && 'available' in data && !data.available) {
    return (
      <Card className="cgi-card bg-cgi-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-cgi-muted-foreground" />
            <CardTitle className="text-lg text-cgi-surface-foreground">First Glass Hatás</CardTitle>
          </div>
          <CardDescription>
            "First Glass" elemzés csak Goorderz integrációval érhető el
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-cgi-muted/30 border border-cgi-muted">
            <Zap className="h-8 w-8 text-cgi-muted-foreground" />
            <div>
              <p className="text-sm text-cgi-surface-foreground font-medium">
                Goorderz Integráció Szükséges
              </p>
              <p className="text-xs text-cgi-muted-foreground">
                A teljes SKU-szintű elemzéshez csatlakoztassa a Goorderz POS rendszert.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analytics = data as FirstGlassAnalytics;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="cgi-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-cgi-secondary" />
            <CardTitle className="text-lg text-cgi-surface-foreground">First Glass Hatás</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-cgi-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Az ingyenes ital beváltása után történő vásárlások elemzése. Megmutatja, hogy a vendégek mit rendelnek még.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge 
            variant="outline" 
            className={`${analytics.roi_multiplier >= 2 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}
          >
            {analytics.roi_multiplier.toFixed(1)}x ROI
          </Badge>
        </div>
        <CardDescription>
          {analytics.total_free_drinks} ingyenes ital · {Math.round(analytics.match_rate * 100)}% párosítva
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Rate Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cgi-muted-foreground">Párosítási arány</span>
            <span className="text-cgi-surface-foreground font-medium">
              {analytics.total_matched_transactions} / {analytics.total_free_drinks}
            </span>
          </div>
          <Progress 
            value={analytics.match_rate * 100} 
            className="h-2 bg-cgi-muted"
          />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-cgi-muted/30 border border-cgi-muted">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-cgi-secondary" />
              <span className="text-xs text-cgi-muted-foreground">Átlag költés</span>
            </div>
            <p className="text-lg font-semibold text-cgi-surface-foreground">
              {formatCurrency(analytics.average_subsequent_spend)}
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-cgi-muted/30 border border-cgi-muted">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-cgi-secondary" />
              <span className="text-xs text-cgi-muted-foreground">Átlag idő</span>
            </div>
            <p className="text-lg font-semibold text-cgi-surface-foreground">
              {analytics.avg_time_to_second_order} perc
            </p>
          </div>
        </div>

        {/* Top Categories */}
        {analytics.top_second_orders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cgi-muted-foreground" />
              <span className="text-sm font-medium text-cgi-surface-foreground">Top kategóriák</span>
            </div>
            <div className="space-y-2">
              {analytics.top_second_orders.slice(0, 3).map((category, index) => (
                <div 
                  key={category.category}
                  className="flex items-center justify-between p-2 rounded bg-cgi-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-cgi-muted-foreground w-4">{index + 1}.</span>
                    <span className="text-sm text-cgi-surface-foreground">{category.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-cgi-muted-foreground">{category.count} db</span>
                    <span className="text-sm font-medium text-cgi-surface-foreground">
                      {formatCurrency(category.avg_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue Summary */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-cgi-primary/10 to-cgi-secondary/10 border border-cgi-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cgi-muted-foreground">Extra bevétel</p>
              <p className="text-2xl font-bold text-cgi-surface-foreground">
                {formatCurrency(analytics.total_additional_revenue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-cgi-muted-foreground">Free drink költség</p>
              <p className="text-lg text-cgi-surface-foreground">
                ~{formatCurrency(analytics.free_drink_cost_estimate)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">
              {analytics.roi_multiplier.toFixed(1)}x megtérülés
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
