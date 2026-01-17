import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { BarChart3, TrendingUp, Target, Award, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export function BrandDashboard() {
  const { data: stats, isLoading } = useDashboardStats('brand');

  const kpiData = {
    totalPartnerVenues: stats?.total_partner_venues ?? 0,
    activeCampaigns: stats?.active_campaigns ?? 0,
    monthlyReach: stats?.monthly_reach ?? 0,
    conversionRate: stats?.conversion_rate ?? 0
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cgi-surface-foreground">Brand Dashboard</h1>
        <p className="text-cgi-muted-foreground mt-2">
          Manage your brand partnerships and campaigns
          {isLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Partner Venues"
          value={isLoading ? "..." : kpiData.totalPartnerVenues.toString()}
          icon={Target}
        />
        <KPICard
          title="Active Campaigns"
          value={isLoading ? "..." : kpiData.activeCampaigns.toString()}
          icon={BarChart3}
        />
        <KPICard
          title="Monthly Reach"
          value={isLoading ? "..." : kpiData.monthlyReach.toLocaleString()}
          icon={TrendingUp}
        />
        <KPICard
          title="Conversion Rate"
          value={isLoading ? "..." : `${kpiData.conversionRate}%`}
          icon={Award}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Campaign Performance">
          <div className="h-48 flex items-center justify-center text-cgi-muted-foreground">
            <p>Campaign performance chart would go here</p>
          </div>
        </ChartCard>
        <Card className="cgi-card">
          <div className="cgi-card-header">
            <h3 className="cgi-card-title">Recent Partnership Activity</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cgi-muted-foreground">Trendy Bar Partnership</span>
              <span className="text-sm text-cgi-success">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cgi-muted-foreground">Downtown Pub Campaign</span>
              <span className="text-sm text-cgi-primary">In Progress</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cgi-muted-foreground">Rooftop Bar Launch</span>
              <span className="text-sm text-cgi-muted-foreground">Scheduled</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}