import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Receipt, DollarSign, Users, TrendingUp, Gift, Settings, ArrowUpRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardStats, formatCurrency } from "@/hooks/useDashboardStats";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FirstGlassWidget } from "./FirstGlassWidget";
import { SimplifiedROIWidget } from "./SimplifiedROIWidget";
import { CSRWidget } from "./CSRWidget";
import { FreeDrinkManager } from "@/components/venue/FreeDrinkManager";

export function OwnerDashboard() {
  // Get user's primary venue
  const { data: userVenue, isLoading: venueLoading } = useQuery({
    queryKey: ['user-primary-venue'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: membership } = await supabase
        .from('venue_memberships')
        .select('venue_id, venues(id, name, integration_type, csr_enabled)')
        .eq('profile_id', user.id)
        .limit(1)
        .single();
        
      return membership?.venues as { 
        id: string; 
        name: string; 
        integration_type: string | null;
        csr_enabled: boolean | null;
      } | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const venueId = userVenue?.id;
  const { data: stats, isLoading: statsLoading } = useDashboardStats('owner', venueId);
  const isLoading = venueLoading || statsLoading;

  const isGoorderz = userVenue?.integration_type === 'goorderz';
  const isSaltEdge = userVenue?.integration_type === 'saltedge';
  const csrEnabled = userVenue?.csr_enabled === true;

  const kpiData = {
    daily_redemptions: stats?.daily_redemptions ?? 0,
    daily_revenue: stats?.daily_revenue ?? 0,
    returning_rate: stats?.returning_rate ?? 0,
    avg_basket_value: stats?.avg_basket_value ?? 0,
  };

  const trendData = stats?.trends ?? [];
  const topDrinksData = stats?.top_drinks ?? [];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">
          {userVenue?.name ? `${userVenue.name} Dashboard` : 'Helyszín Dashboard'}
        </h1>
        <p className="text-cgi-muted-foreground">
          Saját venue teljesítmény és menedzsment
          {isLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
        </p>
      </div>

      {/* Venue-specific KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Mai beváltások"
          value={isLoading ? "..." : kpiData.daily_redemptions.toLocaleString()}
          change={{ value: 12, isPositive: true }}
          icon={Receipt}
          tooltip="Az Ön helyszínén ma beváltott italok száma. Ez az adat valós időben frissül és segít nyomon követni a napi teljesítményt."
        />
        <KPICard
          title="Napi forgalom"
          value={isLoading ? "..." : formatCurrency(kpiData.daily_revenue)}
          change={{ value: 8, isPositive: true }}
          icon={DollarSign}
          tooltip="A mai nap teljes bevétele az italbeváltásokból és egyéb vásárlásokból. Tartalmazza mind a fizetős, mind az ingyenes italok elszámolását."
        />
        <KPICard
          title="Visszatérő arány"
          value={isLoading ? "..." : `${kpiData.returning_rate}%`}
          change={{ value: 5, isPositive: true }}
          icon={Users}
          tooltip="A visszatérő vendégek aránya az összes mai látogatóhoz képest. Magasabb érték erősebb vendéglojalitást jelez."
        />
        <KPICard
          title="Átlag kosárérték"
          value={isLoading ? "..." : formatCurrency(kpiData.avg_basket_value)}
          change={{ value: 15, isPositive: true }}
          icon={TrendingUp}
          tooltip="Az egy látogató által átlagosan elköltött összeg. Ez tartalmazza az italokat és egyéb termékeket is."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Venue Trend Chart */}
        <ChartCard 
          title="Heti trend - Saját venue"
          tooltip="Az elmúlt hét beváltásainak alakulása. Segít azonosítani a forgalmi mintákat és a legnépszerűbb napokat."
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
                  stroke="#1fb1b7" 
                  strokeWidth={2}
                  dot={{ fill: '#1fb1b7', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#1fb1b7', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top Drinks for Venue */}
        <ChartCard 
          title="Top 5 ital - Saját venue"
          tooltip="Az Ön helyszínének legnépszerűbb italai beváltások száma szerint. Hasznos a menü optimalizálásához és készletgazdálkodáshoz."
        >
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cgi-muted-foreground" />
            </div>
          ) : topDrinksData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-cgi-muted-foreground">
              Nincs még adat
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topDrinksData} layout="horizontal">
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
                  fill="#1fb1b7"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Integration-specific Analytics Widgets */}
      {venueId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Free Drink Manager Widget - always show for venue owners */}
          <FreeDrinkManager venueId={venueId} compact />

          {/* First Glass Widget for Goorderz venues */}
          {isGoorderz && (
            <FirstGlassWidget venueId={venueId} />
          )}

          {/* Simplified ROI Widget for Salt Edge venues */}
          {isSaltEdge && (
            <SimplifiedROIWidget venueId={venueId} />
          )}

          {/* CSR Widget if enabled */}
          {csrEnabled && (
            <CSRWidget venueId={venueId} />
          )}
        </div>
      )}

      {/* Owner Management Links */}
      <ChartCard 
        title="Venue Menedzsment"
        tooltip="Gyors hozzáférés a helyszín kezelési funkciókhoz. Itt módosíthatja a jutalmakat, tekintheti meg a részletes analitikákat és kezelheti a beállításokat."
      >
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
