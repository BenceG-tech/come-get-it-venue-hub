import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Building, DollarSign, Users, Zap, TrendingUp, ArrowUpRight } from "lucide-react";
import { 
  mockAdminKPIData, 
  mockAdminTrendData, 
  mockTopVenuesData,
  formatCurrency 
} from "@/lib/mockData";
import { Link } from "react-router-dom";

export function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Platform Áttekintés</h1>
        <p className="text-cgi-muted-foreground">
          Globális statisztikák és venue összehasonlítás
        </p>
      </div>

      {/* Global KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Összes beváltás"
          value={mockAdminKPIData.total_redemptions}
          change={{ value: 15, isPositive: true }}
          icon={Zap}
          tooltip="Az összes aktív helyszínen beváltott italok teljes száma a mai napon. Ez a platform teljes aktivitásának fő mutatója."
        />
        <KPICard
          title="Platform forgalom"
          value={formatCurrency(mockAdminKPIData.total_revenue)}
          change={{ value: 12, isPositive: true }}
          icon={DollarSign}
          tooltip="A teljes platform napi bevétele az összes helyszínről összesítve. Tartalmazza az italbeváltásokat és a kapcsolódó vásárlásokat."
        />
        <KPICard
          title="Összes felhasználó"
          value={mockAdminKPIData.total_users}
          change={{ value: 8, isPositive: true }}
          icon={Users}
          tooltip="A platformon regisztrált felhasználók teljes száma. Ez mutatja a felhasználói bázis növekedését és aktivitását."
        />
        <KPICard
          title="Aktív helyszínek"
          value={mockAdminKPIData.active_venues}
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockAdminTrendData}>
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
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#06b6d4', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Venues */}
        <ChartCard 
          title="Top 5 Helyszín - Bevétel"
          tooltip="A legjobban teljesítő helyszínek bevétel alapján rangsorolva. Ez segít azonosítani a sikeres partnereket és a legjobb gyakorlatokat."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockTopVenuesData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
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
                fill="#06b6d4"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
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
