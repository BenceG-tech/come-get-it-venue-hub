import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Building, DollarSign, Users, Zap, TrendingUp, ArrowUpRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardStats, formatCurrency } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminDashboard() {
  const { data: stats, isLoading, error } = useDashboardStats('admin');

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Összes beváltás"
          value={isLoading ? "..." : kpiData.total_redemptions.toLocaleString()}
          change={{ value: 15, isPositive: true }}
          icon={Zap}
          tooltip="Az összes aktív helyszínen beváltott italok teljes száma. Ez a platform teljes aktivitásának fő mutatója."
        />
        <KPICard
          title="Platform forgalom"
          value={isLoading ? "..." : formatCurrency(kpiData.total_revenue)}
          change={{ value: 12, isPositive: true }}
          icon={DollarSign}
          tooltip="A teljes platform napi bevétele az összes helyszínről összesítve. Tartalmazza az italbeváltásokat és a kapcsolódó vásárlásokat."
        />
        <KPICard
          title="Összes felhasználó"
          value={isLoading ? "..." : kpiData.total_users.toLocaleString()}
          change={{ value: 8, isPositive: true }}
          icon={Users}
          tooltip="A platformon regisztrált felhasználók teljes száma. Ez mutatja a felhasználói bázis növekedését és aktivitását."
        />
        <KPICard
          title="Aktív helyszínek"
          value={isLoading ? "..." : kpiData.active_venues.toLocaleString()}
          change={{ value: 5, isPositive: true }}
          icon={Building}
          tooltip="A jelenleg aktív és működő helyszínek száma. Egy helyszín akkor aktív, ha rendelkezik érvényes előfizetéssel és fogad beváltásokat."
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
                  contentStyle={{ 
                    backgroundColor: '#1f1f1f', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
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
                  contentStyle={{ 
                    backgroundColor: '#1f1f1f', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f3f4f6'
                  }}
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