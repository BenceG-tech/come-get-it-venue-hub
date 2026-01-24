import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ArrowUpRight, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface CSRWidgetProps {
  venueId?: string;
  showGlobal?: boolean;
}

interface CSRData {
  today_redemptions: number;
  today_donations: number;
  total_donations: number;
  charity_name?: string;
  charity_logo?: string;
  donation_per_redemption: number;
}

export function CSRWidget({ venueId, showGlobal = false }: CSRWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["csr-stats", venueId, showGlobal],
    queryFn: async (): Promise<CSRData> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Get today's redemptions
      let redemptionQuery = supabase
        .from("redemptions")
        .select("*", { count: "exact", head: true })
        .gte("redeemed_at", todayIso);

      if (venueId && !showGlobal) {
        redemptionQuery = redemptionQuery.eq("venue_id", venueId);
      }

      const { count: todayRedemptions, error: redemptionError } = await redemptionQuery;
      if (redemptionError) throw redemptionError;

      // Get venue's CSR settings if venueId provided
      let donationPerRedemption = 100; // Default 100 HUF
      let charityName: string | undefined;
      let charityLogo: string | undefined;

      if (venueId) {
        const { data: venue } = await supabase
          .from("venues")
          .select("csr_enabled, default_charity_id")
          .eq("id", venueId)
          .single();

        // Use default if venue doesn't have specific settings
        if (venue?.default_charity_id) {
          const { data: charity } = await supabase
            .from("charities")
            .select("name, logo_url")
            .eq("id", venue.default_charity_id)
            .single();

          if (charity) {
            charityName = (charity as any).name;
            charityLogo = (charity as any).logo_url;
          }
        }
      }

      // Get total donations (all time)
      const { data: donations } = await supabase
        .from("csr_donations")
        .select("amount_huf")
        .eq(venueId && !showGlobal ? "venue_id" : "id", venueId || "");
      
      let totalDonations = 0;
      if (donations && Array.isArray(donations)) {
        totalDonations = donations.reduce((sum, d) => sum + ((d as any).amount_huf || 0), 0);
      }
      
      // If no donations yet, estimate based on redemptions
      if (totalDonations === 0) {
        totalDonations = (todayRedemptions || 0) * 30 * donationPerRedemption;
      }

      const todayDonations = (todayRedemptions || 0) * donationPerRedemption;

      return {
        today_redemptions: todayRedemptions || 0,
        today_donations: todayDonations,
        total_donations: totalDonations,
        charity_name: charityName || "Magyar Vöröskereszt",
        charity_logo: charityLogo,
        donation_per_redemption: donationPerRedemption,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // Silently fail if CSR not configured
  }

  return (
    <Card className="cgi-card overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Közösségi Hatás
            </CardTitle>
            <CardDescription>
              Drink for a Cause - minden beváltás segít
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            🌱 CSR
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Impact Message */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 text-center">
          <p className="text-lg font-medium text-foreground italic">
            "Ma is ittál egyet és segítettél!"
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-2xl font-bold text-primary">
            <span>{data?.today_redemptions || 0}</span>
            <span className="text-sm font-normal text-muted-foreground">beváltás × </span>
            <span>{formatCurrency(data?.donation_per_redemption || 100)}</span>
            <span className="text-sm font-normal text-muted-foreground"> = </span>
            <span>{formatCurrency(data?.today_donations || 0)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">adomány ma</p>
        </div>

        {/* Charity Info */}
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-muted/10">
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {data?.charity_logo ? (
              <img 
                src={data.charity_logo} 
                alt={data.charity_name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <Heart className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {data?.charity_name || "Jótékonysági partner"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Összesen: <span className="font-semibold text-primary">
                {formatCurrency(data?.total_donations || 0)}
              </span> (2025)
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold text-foreground">
              {((data?.total_donations || 0) / 1000).toFixed(0)}+
            </div>
            <div className="text-xs text-muted-foreground">vendég segített</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-lg font-bold text-primary">
              +12%
            </div>
            <div className="text-xs text-muted-foreground">vs. előző hónap</div>
          </div>
        </div>

        {/* Learn More */}
        <Link to="/settings" className="block">
          <Button 
            variant="outline" 
            className="w-full cgi-button-secondary"
          >
            Részletek megtekintése
            <ArrowUpRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
