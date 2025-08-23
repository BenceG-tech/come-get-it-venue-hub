
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PageLayout } from "@/components/PageLayout";
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Receipt, DollarSign, Users, Zap, Gift, CreditCard, Settings, ArrowUpRight } from "lucide-react";
import { 
  mockKPIData, 
  mockTrendData, 
  mockDrinkData, 
  formatCurrency 
} from "@/lib/mockData";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const quickLinks = [
    { name: 'Jutalmak kezelése', href: '/rewards', icon: Gift },
    { name: 'Tranzakciók', href: '/transactions', icon: CreditCard },
    { name: 'Beállítások', href: '/settings', icon: Settings },
  ];

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Dashboard</h1>
        <p className="text-cgi-muted-foreground">
          Üdvözöljük a Come Get It partner felületén
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Napi beváltások"
          value={mockKPIData.daily_redemptions}
          change={{ value: 12, isPositive: true }}
          icon={Receipt}
        />
        <KPICard
          title="CGI forgalom"
          value={formatCurrency(mockKPIData.revenue_generated)}
          change={{ value: 8, isPositive: true }}
          icon={DollarSign}
        />
        <KPICard
          title="Aktív felhasználók"
          value={mockKPIData.active_users}
          change={{ value: -3, isPositive: false }}
          icon={Users}
        />
        <KPICard
          title="Gyűjtött pontok"
          value={mockKPIData.points_collected.toLocaleString()}
          change={{ value: 15, isPositive: true }}
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Trend Chart */}
        <ChartCard title="Heti trend - Beváltások">
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

        {/* Top Drinks Chart */}
        <ChartCard title="Top 5 ital">
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

      {/* Quick Links */}
      <ChartCard title="Gyorslinkek" className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.name} to={link.href}>
                <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
                  <Icon className="h-5 w-5 mr-3 text-cgi-secondary" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{link.name}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
                </Button>
              </Link>
            );
          })}
        </div>
      </ChartCard>
    </PageLayout>
  );
}
