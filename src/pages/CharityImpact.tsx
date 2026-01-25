import { useState, useEffect } from 'react';
import { PageLayout } from "@/components/PageLayout";
import { ChartCard } from "@/components/ChartCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, TrendingUp, Users, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CharityImpactSummary {
  charity_name: string;
  impact_unit: string;
  total_donations: number;
  total_huf: number;
  total_impact_units: number;
  platform_contribution: number;
  sponsor_contribution: number;
  venue_contribution: number;
}

interface TopDonor {
  user_id: string;
  total_impact_units: number;
  total_donations_huf: number;
  current_streak_days: number;
}

interface BrandContribution {
  brand_name: string;
  total_contribution_huf: number;
  donation_count: number;
}

const COLORS = ['#1fb1b7', '#06b6d4', '#0891b2', '#0e7490', '#155e75'];

export default function CharityImpact() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [impactSummary, setImpactSummary] = useState<CharityImpactSummary[]>([]);
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [brandContributions, setBrandContributions] = useState<BrandContribution[]>([]);
  const [totalStats, setTotalStats] = useState({
    total_donations_huf: 0,
    total_impact_units: 0,
    total_users_participated: 0,
    total_donations_count: 0,
  });

  useEffect(() => {
    loadCharityData();
  }, []);

  const loadCharityData = async () => {
    try {
      setLoading(true);

      // Get charity impact summary from view
      const { data: impactData, error: impactError } = await supabase
        .from('charity_impact_summary')
        .select('*')
        .order('total_impact_units', { ascending: false });

      if (impactError) throw impactError;

      // Get top donors
      const { data: donorsData, error: donorsError } = await supabase
        .from('user_csr_stats')
        .select('user_id, total_impact_units, total_donations_huf, current_streak_days')
        .order('total_impact_units', { ascending: false })
        .limit(10);

      if (donorsError) throw donorsError;

      // Get brand contributions
      const { data: brandData, error: brandError } = await supabase
        .from('charity_donations')
        .select(`
          sponsor_brand_id,
          sponsor_contribution_huf,
          brands:sponsor_brand_id(name)
        `)
        .not('sponsor_brand_id', 'is', null);

      if (brandError) throw brandError;

      // Aggregate brand contributions
      const brandMap = new Map<string, { total: number; count: number }>();
      brandData?.forEach((donation: any) => {
        const brandName = donation.brands?.name || 'Unknown Brand';
        const existing = brandMap.get(brandName) || { total: 0, count: 0 };
        brandMap.set(brandName, {
          total: existing.total + (donation.sponsor_contribution_huf || 0),
          count: existing.count + 1,
        });
      });

      const brandsArray = Array.from(brandMap.entries()).map(([name, data]) => ({
        brand_name: name,
        total_contribution_huf: data.total,
        donation_count: data.count,
      })).sort((a, b) => b.total_contribution_huf - a.total_contribution_huf);

      // Calculate total stats
      const { data: statsData, error: statsError } = await supabase
        .from('charity_donations')
        .select('total_donation_huf, impact_units, user_id');

      if (statsError) throw statsError;

      const uniqueUsers = new Set(statsData?.map(d => d.user_id) || []);
      const totals = {
        total_donations_huf: statsData?.reduce((sum, d) => sum + (d.total_donation_huf || 0), 0) || 0,
        total_impact_units: statsData?.reduce((sum, d) => sum + (d.impact_units || 0), 0) || 0,
        total_users_participated: uniqueUsers.size,
        total_donations_count: statsData?.length || 0,
      };

      setImpactSummary(impactData || []);
      setTopDonors(donorsData || []);
      setBrandContributions(brandsArray);
      setTotalStats(totals);

    } catch (error) {
      console.error('Error loading charity data:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a jótékonysági adatokat.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">
          Jótékonysági Hatás
        </h1>
        <p className="text-cgi-muted-foreground">
          A Come Get It platform által generált társadalmi hatás áttekintése
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="cgi-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Összes Adomány</CardTitle>
            <Heart className="h-4 w-4 text-cgi-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cgi-surface-foreground">
              {totalStats.total_donations_huf.toLocaleString('hu-HU')} Ft
            </div>
            <p className="text-xs text-cgi-muted-foreground">
              {totalStats.total_donations_count} tranzakcióból
            </p>
          </CardContent>
        </Card>

        <Card className="cgi-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Összhatás</CardTitle>
            <TrendingUp className="h-4 w-4 text-cgi-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cgi-surface-foreground">
              {totalStats.total_impact_units.toLocaleString('hu-HU')}
            </div>
            <p className="text-xs text-cgi-muted-foreground">
              adag étel / oltás / támogatás
            </p>
          </CardContent>
        </Card>

        <Card className="cgi-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Részt vevő Felhasználók</CardTitle>
            <Users className="h-4 w-4 text-cgi-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cgi-surface-foreground">
              {totalStats.total_users_participated.toLocaleString('hu-HU')}
            </div>
            <p className="text-xs text-cgi-muted-foreground">
              adományozó
            </p>
          </CardContent>
        </Card>

        <Card className="cgi-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Átlagos Adomány</CardTitle>
            <Award className="h-4 w-4 text-cgi-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cgi-surface-foreground">
              {totalStats.total_donations_count > 0
                ? Math.round(totalStats.total_donations_huf / totalStats.total_donations_count)
                : 0} Ft
            </div>
            <p className="text-xs text-cgi-muted-foreground">
              / tranzakció
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charity Partners Impact */}
      <ChartCard title="Jótékonysági Partnerek Hatása" className="mb-8">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={impactSummary}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--cgi-muted))" />
            <XAxis
              dataKey="charity_name"
              stroke="hsl(var(--cgi-muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis stroke="hsl(var(--cgi-muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--cgi-surface))',
                border: '1px solid hsl(var(--cgi-muted))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="total_impact_units" fill="#1fb1b7" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Brand Contributions Pie Chart */}
        <ChartCard title="Szponzor Márkák Hozzájárulása">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={brandContributions.slice(0, 5)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ brand_name, percent }: any) =>
                  `${brand_name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_contribution_huf"
              >
                {brandContributions.slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--cgi-surface))',
                  border: '1px solid hsl(var(--cgi-muted))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `${value.toLocaleString('hu-HU')} Ft`}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Donors Leaderboard */}
        <Card className="cgi-card">
          <CardHeader>
            <CardTitle>Top 10 Adományozó</CardTitle>
            <CardDescription>Legnagyobb hatású felhasználók</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDonors.map((donor, index) => (
                <div
                  key={donor.user_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-cgi-surface-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cgi-primary text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-cgi-surface-foreground">
                        {donor.user_id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-cgi-muted-foreground">
                        {donor.current_streak_days} napos sorozat
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-cgi-primary">
                      {donor.total_impact_units} adag
                    </div>
                    <div className="text-xs text-cgi-muted-foreground">
                      {donor.total_donations_huf.toLocaleString('hu-HU')} Ft
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Charity Breakdown */}
      <Card className="cgi-card">
        <CardHeader>
          <CardTitle>Részletes Lebontás Jótékonysági Partnerenként</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cgi-muted">
                  <th className="text-left py-3 px-4 text-cgi-muted-foreground font-medium">
                    Partner
                  </th>
                  <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">
                    Összes Adomány
                  </th>
                  <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">
                    Hatás
                  </th>
                  <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">
                    Platform
                  </th>
                  <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">
                    Szponzorok
                  </th>
                  <th className="text-right py-3 px-4 text-cgi-muted-foreground font-medium">
                    Helyszínek
                  </th>
                </tr>
              </thead>
              <tbody>
                {impactSummary.map((charity, index) => (
                  <tr
                    key={index}
                    className="border-b border-cgi-muted hover:bg-cgi-surface-accent transition-colors"
                  >
                    <td className="py-3 px-4 text-cgi-surface-foreground font-medium">
                      {charity.charity_name}
                    </td>
                    <td className="py-3 px-4 text-right text-cgi-surface-foreground">
                      {(charity.total_huf || 0).toLocaleString('hu-HU')} Ft
                    </td>
                    <td className="py-3 px-4 text-right text-cgi-primary font-semibold">
                      {charity.total_impact_units || 0} {charity.impact_unit}
                    </td>
                    <td className="py-3 px-4 text-right text-cgi-muted-foreground">
                      {(charity.platform_contribution || 0).toLocaleString('hu-HU')} Ft
                    </td>
                    <td className="py-3 px-4 text-right text-cgi-muted-foreground">
                      {(charity.sponsor_contribution || 0).toLocaleString('hu-HU')} Ft
                    </td>
                    <td className="py-3 px-4 text-right text-cgi-muted-foreground">
                      {(charity.venue_contribution || 0).toLocaleString('hu-HU')} Ft
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
