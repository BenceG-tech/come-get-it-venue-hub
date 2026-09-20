import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { chartTooltipStyle, barChartCursor } from "@/lib/chartStyles";
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Building, DollarSign, Users, Zap, TrendingUp, ArrowUpRight, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardStats, formatCurrency } from "@/hooks/useDashboardStats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useVisibleRewardsCount } from "@/hooks/useVisibleRewardsCount";

export function AdminDashboard() {
  const { data: stats, isLoading } = useDashboardStats('admin');
  const { data: rewardCounts, isLoading: rewardsLoading } = useVisibleRewardsCount();

  // Fallback data for loading/error states
  const kpiData = {
    total_redemptions: stats?.total_redemptions ?? 0,
    total_revenue: stats?.total_revenue ?? 0,
    total_users: stats?.total_users ?? 0,
    active_venues: stats?.active_venues ?? 0,
  };

  const trendData = stats?.trends ?? [];
  const topVenuesData = stats?.top_venues ?? [];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Platform Áttekintés</h1>
        <p className="text-cgi-muted-foreground">
          Globális statisztikák és venue összehasonlítás
          {isLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
        </p>
      </div>

      {/* Global KPI Cards */}
      {/* Warning: nothing is publishable to the mobile app */}
      {!rewardsLoading && rewardCounts && rewardCounts.visible === 0 && (
        <Alert className="border-cgi-warning/40 bg-cgi-warning/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Egyetlen jutalom sem látható az appban</AlertTitle>
          <AlertDescription>
            {rewardCounts.total === 0
              ? 'Még nincs létrehozott jutalom. A mobilapp jelenleg üres jutalomlistát kap.'
              : `${rewardCounts.total} jutalom létezik, de egyik sem felel meg a megjelenítési feltételeknek (aktív, érvényes, limit alatt, nem szüneteltetett helyszín).`}{' '}
            <Link to="/rewards" className="underline">Jutalmak kezelése</Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Összes beváltás"
          value={isLoading ? "..." : kpiData.total_redemptions.toLocaleString()}
          icon={Zap}
          tooltip="Az összes aktív helyszínen beváltott italok teljes száma. Ez a platform teljes aktivitásának fő mutatója."
        />
        <KPICard
          title="Tranzakciós forgalom"
          value={isLoading ? "..." : formatCurrency(kpiData.total_revenue)}
          icon={DollarSign}
          tooltip="A POS / banki tranzakciókból (transactions.amount) származó teljes összeg. Nem tartalmazza a beváltott italok névértékét."
        />
        <KPICard
          title="Összes felhasználó"
          value={isLoading ? "..." : kpiData.total_users.toLocaleString()}
          icon={Users}
          tooltip="A platformon regisztrált felhasználók teljes száma."
        />
        <KPICard
          title="Aktív helyszínek"
          value={isLoading ? "..." : kpiData.active_venues.toLocaleString()}
          icon={Building}
          tooltip="A nem szüneteltetett helyszínek száma – ezek jelennek meg a mobilappban."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Trend Chart */}
        <ChartCard 
          title="Platform Trend - Heti összesítés"
          tooltip="Az összes helyszín beváltásainak összesített heti trendje. Segít azonosítani a platform szintű növekedési mintákat és szezonális változásokat."
        >
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cgi-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  {...chartTooltipStyle}
                  formatter={(value: any) => [value, 'Beváltások']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('hu-HU')}
                />
                <Line 
                  type="monotone" 
                  dataKey="redemptions" 
                  stroke="hsl(var(--cgi-role-admin))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--cgi-role-admin))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--cgi-role-admin))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top Venues */}
        <ChartCard 
          title="Top 5 Helyszín - Bevétel"
          tooltip="A legjobban teljesítő helyszínek bevétel alapján rangsorolva. Ez segít azonosítani a sikeres partnereket és a legjobb gyakorlatokat."
        >
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cgi-muted-foreground" />
            </div>
          ) : topVenuesData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-cgi-muted-foreground">
              Nincs még adat
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topVenuesData} layout="vertical" style={{ backgroundColor: 'transparent' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#9ca3af" 
                  fontSize={12}
                  width={100}
                />
                <Tooltip 
                  {...chartTooltipStyle}
                  cursor={barChartCursor}
                  formatter={(value: any) => [formatCurrency(value), 'Bevétel']}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--cgi-role-admin))"
                  radius={[0, 4, 4, 0]}
                  background={{ fill: 'transparent' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Admin Quick Actions */}
      <ChartCard 
        title="Platform Menedzsment"
        tooltip="Központi adminisztrációs funkciók gyors elérése. Itt kezelheti a helyszíneket, elemezheti a teljesítményeket és adminisztrálhatja a márkákat."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/venues">
            <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
              <Building className="h-5 w-5 mr-3 text-cgi-secondary" />
              <div className="flex-1 text-left">
                <p className="font-medium">Helyszínek kezelése</p>
                <p className="text-xs text-cgi-muted-foreground">Venues & settings</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
            </Button>
          </Link>
          
          <Link to="/venues/comparison">
            <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
              <TrendingUp className="h-5 w-5 mr-3 text-cgi-secondary" />
              <div className="flex-1 text-left">
                <p className="font-medium">Venue Összehasonlítás</p>
                <p className="text-xs text-cgi-muted-foreground">Performance analysis</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
            </Button>
          </Link>
          
          <Link to="/brands">
            <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
              <Building className="h-5 w-5 mr-3 text-cgi-secondary" />
              <div className="flex-1 text-left">
                <p className="font-medium">Márkák kezelése</p>
                <p className="text-xs text-cgi-muted-foreground">Brand partnerships</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
            </Button>
          </Link>
        </div>
      </ChartCard>
    </div>
  );
}