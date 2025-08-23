
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Receipt, DollarSign, Users, TrendingUp, Gift, Settings, ArrowUpRight } from "lucide-react";
import { 
  mockOwnerKPIData, 
  mockTrendData, 
  mockDrinkData, 
  formatCurrency 
} from "@/lib/mockData";
import { Link } from "react-router-dom";

export function OwnerDashboard() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Helyszín Dashboard</h1>
        <p className="text-cgi-muted-foreground">
          Saját venue teljesítmény és menedzsment
        </p>
      </div>

      {/* Venue-specific KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Mai beváltások"
          value={mockOwnerKPIData.daily_redemptions}
          change={{ value: 12, isPositive: true }}
          icon={Receipt}
        />
        <KPICard
          title="Napi forgalom"
          value={formatCurrency(mockOwnerKPIData.daily_revenue)}
          change={{ value: 8, isPositive: true }}
          icon={DollarSign}
        />
        <KPICard
          title="Visszatérő arány"
          value={`${mockOwnerKPIData.returning_rate}%`}
          change={{ value: 5, isPositive: true }}
          icon={Users}
        />
        <KPICard
          title="Átlag kosárérték"
          value={formatCurrency(mockOwnerKPIData.avg_basket_value)}
          change={{ value: 15, isPositive: true }}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Venue Trend Chart */}
        <ChartCard title="Heti trend - Saját venue">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockTrendData}>
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

        {/* Top Drinks for Venue */}
        <ChartCard title="Top 5 ital - Saját venue">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockDrinkData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#9ca3af" 
                fontSize={12}
                width={80}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f1f1f', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f3f4f6'
                }}
                formatter={(value: any) => [value, 'Beváltások']}
              />
              <Bar 
                dataKey="count" 
                fill="#06b6d4"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Owner Management Links */}
      <ChartCard title="Venue Menedzsment">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/rewards">
            <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
              <Gift className="h-5 w-5 mr-3 text-cgi-secondary" />
              <div className="flex-1 text-left">
                <p className="font-medium">Jutalmak kezelése</p>
                <p className="text-xs text-cgi-muted-foreground">Rewards & campaigns</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
            </Button>
          </Link>
          
          <Link to="/analytics">
            <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
              <TrendingUp className="h-5 w-5 mr-3 text-cgi-secondary" />
              <div className="flex-1 text-left">
                <p className="font-medium">Részletes analitika</p>
                <p className="text-xs text-cgi-muted-foreground">Deep insights</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
            </Button>
          </Link>
          
          <Link to="/settings">
            <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
              <Settings className="h-5 w-5 mr-3 text-cgi-secondary" />
              <div className="flex-1 text-left">
                <p className="font-medium">Venue beállítások</p>
                <p className="text-xs text-cgi-muted-foreground">Settings & staff</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
            </Button>
          </Link>
        </div>
      </ChartCard>
    </div>
  );
}
