import { useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building, 
  Factory, 
  TrendingUp, 
  Users, 
  Target, 
  Clock, 
  Gift,
  BarChart3,
  PieChart,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from "lucide-react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface VenueInsights {
  push_notification_lift: number;
  targeting_precision: number;
  peak_hour_accuracy: number;
  free_drink_roi: number;
  returning_customer_rate: number;
  avg_visits_per_user: number;
}

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

interface VenuePenetration {
  venue_id: string;
  venue_name: string;
  total_redemptions: number;
  unique_users: number;
  returning_users: number;
  returning_rate: number;
}

interface BrandInsights {
  category_breakdown: CategoryData[];
  brand_penetration_by_venue: VenuePenetration[];
  sponsored_lift: number;
  top_trending_drinks: { name: string; count: number; trend: number }[];
}

interface PlatformSynergies {
  total_users: number;
  total_venues: number;
  total_redemptions: number;
  network_effect_score: number;
  cross_venue_visitors_pct: number;
  brand_exposure_lift: number;
  avg_redemptions_per_user: number;
  power_users_count: number;
}

interface DataValueInsights {
  venue_insights: VenueInsights;
  brand_insights: BrandInsights;
  platform_synergies: PlatformSynergies;
}

const COLORS = ['hsl(var(--cgi-secondary))', 'hsl(var(--cgi-primary))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DataInsights() {
  const [data, setData] = useState<DataValueInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Nincs bejelentkezve");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-data-value-insights",
          {
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json"
            }
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch insights");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching data insights:", err);
        setError("Hiba történt az adatok betöltésekor");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !data) {
    return (
      <PageLayout>
        <Card className="cgi-card p-8 text-center">
          <p className="text-cgi-error">{error || "Adatok nem elérhetők"}</p>
        </Card>
      </PageLayout>
    );
  }

  const { venue_insights, brand_insights, platform_synergies } = data;

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-cgi-secondary" />
            <h1 className="text-3xl font-bold text-cgi-surface-foreground">Adat Értékteremtés</h1>
          </div>
          <p className="text-cgi-muted-foreground text-lg">
            Így segítjük a vendéglátóhelyeket és italmárkákat valós üzleti értékkel
          </p>
        </div>

        {/* Platform Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cgi-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-cgi-secondary" />
                <span className="text-sm text-cgi-muted-foreground">Felhasználók</span>
              </div>
              <p className="text-3xl font-bold text-cgi-surface-foreground">{platform_synergies.total_users}</p>
            </CardContent>
          </Card>
          <Card className="cgi-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-5 w-5 text-cgi-secondary" />
                <span className="text-sm text-cgi-muted-foreground">Helyszínek</span>
              </div>
              <p className="text-3xl font-bold text-cgi-surface-foreground">{platform_synergies.total_venues}</p>
            </CardContent>
          </Card>
          <Card className="cgi-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-5 w-5 text-cgi-secondary" />
                <span className="text-sm text-cgi-muted-foreground">Beváltások</span>
              </div>
              <p className="text-3xl font-bold text-cgi-surface-foreground">{platform_synergies.total_redemptions}</p>
            </CardContent>
          </Card>
          <Card className="cgi-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-cgi-secondary" />
                <span className="text-sm text-cgi-muted-foreground">Power Users</span>
              </div>
              <p className="text-3xl font-bold text-cgi-surface-foreground">{platform_synergies.power_users_count}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Venues and Brands */}
        <Tabs defaultValue="venues" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-cgi-surface">
            <TabsTrigger value="venues" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Vendéglátóhelyeknek
            </TabsTrigger>
            <TabsTrigger value="brands" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Italmárkáknak
            </TabsTrigger>
          </TabsList>

          {/* Venues Tab */}
          <TabsContent value="venues" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Push Notification Lift */}
              <Card className="cgi-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-cgi-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Push Értesítés Lift
                      <InfoTooltip content="Az AI-alapú push értesítések hatására mennyivel nő a visszatérő vendégek aránya a kontroll csoporthoz képest." />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-cgi-success">+{venue_insights.push_notification_lift}%</span>
                  </div>
                  <p className="text-xs text-cgi-muted-foreground mt-2">visszatérési ráta növekedés</p>
                </CardContent>
              </Card>

              {/* Targeting Precision */}
              <Card className="cgi-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-cgi-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Célzási Pontosság
                      <InfoTooltip content="A hűségprogram adatai alapján mennyivel pontosabb célzás érhető el a hagyományos marketinghez képest." />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-cgi-secondary">{venue_insights.targeting_precision}x</span>
                  </div>
                  <p className="text-xs text-cgi-muted-foreground mt-2">pontosabb szegmentálás</p>
                </CardContent>
              </Card>

              {/* Peak Hour Accuracy */}
              <Card className="cgi-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-cgi-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Csúcsidő Előrejelzés
                      <InfoTooltip content="A heatmap adatok alapján milyen pontossággal tudjuk előrejelezni a csúcsidőket személyzeti optimalizációhoz." />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-cgi-primary">{venue_insights.peak_hour_accuracy}%</span>
                  </div>
                  <p className="text-xs text-cgi-muted-foreground mt-2">előrejelzési pontosság</p>
                  <Progress value={venue_insights.peak_hour_accuracy} className="h-1 mt-2" />
                </CardContent>
              </Card>

              {/* Free Drink ROI */}
              <Card className="cgi-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-cgi-muted-foreground flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Free Drink ROI
                      <InfoTooltip content="Az ingyen ital kampányok által generált többletforgalom a promóció költségéhez képest." />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-cgi-success">{venue_insights.free_drink_roi}x</span>
                  </div>
                  <p className="text-xs text-cgi-muted-foreground mt-2">megtérülés</p>
                </CardContent>
              </Card>
            </div>

            {/* Venue Performance */}
            <Card className="cgi-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-cgi-secondary" />
                  Helyszín Teljesítmény
                  <InfoTooltip content="Az egyes helyszínek beváltási statisztikái és visszatérési rátái részletesen." />
                </CardTitle>
                <CardDescription>Beváltások és visszatérési ráták helyszínenként</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={brand_insights.brand_penetration_by_venue.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--cgi-muted))" />
                      <XAxis 
                        dataKey="venue_name" 
                        tick={{ fill: 'hsl(var(--cgi-muted-foreground))', fontSize: 12 }}
                        tickLine={{ stroke: 'hsl(var(--cgi-muted))' }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--cgi-muted-foreground))', fontSize: 12 }}
                        tickLine={{ stroke: 'hsl(var(--cgi-muted))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--cgi-surface))', 
                          border: '1px solid hsl(var(--cgi-muted))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="total_redemptions" name="Beváltások" fill="hsl(var(--cgi-secondary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="returning_rate" name="Visszatérési %" fill="hsl(var(--cgi-primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cgi-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-cgi-secondary" />
                    Visszatérő Vendégek
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-bold text-cgi-success">{venue_insights.returning_customer_rate}%</div>
                    <div>
                      <p className="text-cgi-muted-foreground">A vendégek visszatérnek</p>
                      <p className="text-sm text-cgi-success flex items-center gap-1">
                        <ArrowUpRight className="h-4 w-4" />
                        Iparági átlag: 35%
                      </p>
                    </div>
                  </div>
                  <Progress value={venue_insights.returning_customer_rate} className="h-2 mt-4" />
                </CardContent>
              </Card>

              <Card className="cgi-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="h-5 w-5 text-cgi-secondary" />
                    Átlagos Látogatás/User
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-bold text-cgi-primary">{venue_insights.avg_visits_per_user}</div>
                    <div>
                      <p className="text-cgi-muted-foreground">beváltás/felhasználó</p>
                      <p className="text-sm text-cgi-success flex items-center gap-1">
                        <ArrowUpRight className="h-4 w-4" />
                        +{Math.round((venue_insights.avg_visits_per_user / 2.1 - 1) * 100)}% vs iparág
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Brands Tab */}
          <TabsContent value="brands" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <Card className="cgi-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-cgi-secondary" />
                    Ital Kategóriák
                    <InfoTooltip content="A beváltások megoszlása ital kategóriánként - valós idejű fogyasztói preferencia insight." />
                  </CardTitle>
                  <CardDescription>Fogyasztói preferenciák kategóriánként</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={brand_insights.category_breakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category, percentage }) => `${category}: ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {brand_insights.category_breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--cgi-surface))', 
                            border: '1px solid hsl(var(--cgi-muted))',
                            borderRadius: '8px'
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Trending Drinks */}
              <Card className="cgi-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cgi-secondary" />
                    Trending Italok
                    <InfoTooltip content="A legnépszerűbb italok és azok trendje az elmúlt időszakban." />
                  </CardTitle>
                  <CardDescription>Top 5 legnépszerűbb ital</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {brand_insights.top_trending_drinks.map((drink, index) => (
                      <div key={drink.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-cgi-secondary/10 text-cgi-secondary">
                            #{index + 1}
                          </Badge>
                          <span className="text-cgi-surface-foreground font-medium">{drink.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-cgi-muted-foreground">{drink.count} db</span>
                          <Badge className={drink.trend >= 0 ? "bg-cgi-success/20 text-cgi-success" : "bg-cgi-error/20 text-cgi-error"}>
                            {drink.trend >= 0 ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(drink.trend)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sponsored Lift */}
            <Card className="cgi-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cgi-secondary" />
                  Szponzorált Kampány Hatékonyság
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cgi-success">+{brand_insights.sponsored_lift}%</div>
                    <p className="text-cgi-muted-foreground mt-2">Márka expozíció növekedés</p>
                    <p className="text-xs text-cgi-muted-foreground">vs hagyományos marketing</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cgi-primary">{platform_synergies.cross_venue_visitors_pct}%</div>
                    <p className="text-cgi-muted-foreground mt-2">Cross-venue látogatók</p>
                    <p className="text-xs text-cgi-muted-foreground">2+ helyszínt látogatnak</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cgi-secondary">{platform_synergies.network_effect_score}x</div>
                    <p className="text-cgi-muted-foreground mt-2">Network Effect Score</p>
                    <p className="text-xs text-cgi-muted-foreground">platform szinergia erősség</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Venue Penetration Table */}
            <Card className="cgi-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-cgi-secondary" />
                  Márka Penetráció Helyszínenként
                  <InfoTooltip content="Részletes bontás arról, hogy az egyes helyszíneken hogyan teljesítenek a különböző italok." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-cgi-muted">
                        <th className="text-left py-3 px-4 text-cgi-muted-foreground font-medium">Helyszín</th>
                        <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">Beváltások</th>
                        <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">Egyedi User</th>
                        <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">Visszatérő</th>
                        <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">Visszatérési %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brand_insights.brand_penetration_by_venue.map((venue) => (
                        <tr key={venue.venue_id} className="border-b border-cgi-muted/50 hover:bg-cgi-muted/20">
                          <td className="py-3 px-4 text-cgi-surface-foreground font-medium">{venue.venue_name}</td>
                          <td className="py-3 px-4 text-right text-cgi-surface-foreground">{venue.total_redemptions}</td>
                          <td className="py-3 px-4 text-right text-cgi-muted-foreground">{venue.unique_users}</td>
                          <td className="py-3 px-4 text-right text-cgi-muted-foreground">{venue.returning_users}</td>
                          <td className="py-3 px-4 text-right">
                            <Badge className={venue.returning_rate >= 50 ? "bg-cgi-success/20 text-cgi-success" : "bg-cgi-muted text-cgi-muted-foreground"}>
                              {venue.returning_rate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
