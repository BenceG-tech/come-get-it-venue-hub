import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { BarChart3, TrendingUp, Target, Award } from "lucide-react";

export function BrandDashboard() {
  // Mock data for brand dashboard
  const mockKPIData = {
    totalPartnerVenues: 15,
    activeCampaigns: 3,
    monthlyReach: 2500,
    conversionRate: 12.5
  };

  const mockTrendData = [
    { month: 'Jan', value: 1800 },
    { month: 'Feb', value: 2100 },
    { month: 'Mar', value: 2300 },
    { month: 'Apr', value: 2500 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cgi-surface-foreground">Brand Dashboard</h1>
        <p className="text-cgi-muted-foreground mt-2">
          Manage your brand partnerships and campaigns
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Partner Venues"
          value={mockKPIData.totalPartnerVenues.toString()}
          icon={Target}
        />
        <KPICard
          title="Active Campaigns"
          value={mockKPIData.activeCampaigns.toString()}
          icon={BarChart3}
        />
        <KPICard
          title="Monthly Reach"
          value={mockKPIData.monthlyReach.toLocaleString()}
          icon={TrendingUp}
        />
        <KPICard
          title="Conversion Rate"
          value={`${mockKPIData.conversionRate}%`}
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