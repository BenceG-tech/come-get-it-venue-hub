import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Users, TrendingUp, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { chartTooltipStyle, gridStyle, axisStyle } from "@/lib/chartStyles";

const COLORS = ['hsl(var(--cgi-primary))', 'hsl(var(--cgi-secondary))', '#10b981', '#f59e0b', '#8b5cf6'];

export default function CharityImpact() {
  // Fetch charities
  const { data: charities, isLoading: charitiesLoading } = useQuery({
    queryKey: ['charities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charities')
        .select('*')
        .order('total_received_huf', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch donations with venue info
  const { data: donations, isLoading: donationsLoading } = useQuery({
    queryKey: ['csr_donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csr_donations')
        .select('*, charities(name), venues:venue_id(name)');
      if (error) throw error;
      return data || [];
    }
  });

  const isLoading = charitiesLoading || donationsLoading;

  // Calculate stats
  const totalDonations = donations?.reduce((sum, d) => sum + d.amount_huf, 0) || 0;
  const uniqueUsers = new Set(donations?.map(d => d.user_id).filter(Boolean)).size;
  const avgDonation = donations?.length ? Math.round(totalDonations / donations.length) : 0;
  const totalImpactUnits = Math.floor(totalDonations / 100); // 100 Ft = 1 impact unit

  // Chart data - donations by charity
  const charityChartData = charities?.map(c => ({
    name: c.name,
    amount: c.total_received_huf || 0
  })) || [];

  // Pie chart data - donations by venue
  const venueAggregation = donations?.reduce((acc, d) => {
    const venueName = (d.venues as any)?.name || 'Ismeretlen';
    acc[venueName] = (acc[venueName] || 0) + d.amount_huf;
    return acc;
  }, {} as Record<string, number>) || {};

  const venueChartData = Object.entries(venueAggregation).map(([name, value]) => ({
    name,
    value
  }));

  // Top donors (by user_id count)
  const donorAggregation = donations?.reduce((acc, d) => {
    if (d.user_id) {
      acc[d.user_id] = (acc[d.user_id] || 0) + d.amount_huf;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const topDonors = Object.entries(donorAggregation)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([userId, amount], index) => ({
      rank: index + 1,
      userId: userId.slice(0, 8) + '...',
      amount
    }));

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Jótékonysági Hatás</h1>
            <p className="text-muted-foreground">CSR adományok és társadalmi hatás áttekintése</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cgi-card">
            <div className="cgi-card-header">
              <DollarSign className="h-5 w-5 text-cgi-secondary" />
              <span className="cgi-card-title">Összes Adomány</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <div className="cgi-card-value">{totalDonations.toLocaleString()} Ft</div>
            )}
          </Card>

          <Card className="cgi-card">
            <div className="cgi-card-header">
              <TrendingUp className="h-5 w-5 text-cgi-secondary" />
              <span className="cgi-card-title">Összhatás</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <div className="cgi-card-value">{totalImpactUnits} egység</div>
            )}
          </Card>

          <Card className="cgi-card">
            <div className="cgi-card-header">
              <Users className="h-5 w-5 text-cgi-secondary" />
              <span className="cgi-card-title">Résztvevő Felhasználók</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <div className="cgi-card-value">{uniqueUsers}</div>
            )}
          </Card>

          <Card className="cgi-card">
            <div className="cgi-card-header">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="cgi-card-title">Átlagos Adomány</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <div className="cgi-card-value">{avgDonation.toLocaleString()} Ft</div>
            )}
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Donations by Charity */}
          <Card className="cgi-card">
            <div className="cgi-card-header">
              <h3 className="cgi-card-title">Adományok Partner Szerint</h3>
            </div>
            <div className="h-[300px] mt-4">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : charityChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Még nincsenek adatok
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charityChartData}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="name" {...axisStyle} />
                    <YAxis {...axisStyle} />
                    <Tooltip {...chartTooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} Ft`, 'Összeg']} />
                    <Bar dataKey="amount" fill="hsl(var(--cgi-primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Pie Chart - Donations by Venue */}
          <Card className="cgi-card">
            <div className="cgi-card-header">
              <h3 className="cgi-card-title">Helyszín Hozzájárulások</h3>
            </div>
            <div className="h-[300px] mt-4">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : venueChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Még nincsenek adatok
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={venueChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {venueChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} Ft`, 'Összeg']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Top Donors Leaderboard */}
        <Card className="cgi-card">
          <div className="cgi-card-header">
            <h3 className="cgi-card-title">Top 10 Adományozó</h3>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topDonors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Még nincsenek adományozók
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Helyezés</TableHead>
                    <TableHead>Felhasználó ID</TableHead>
                    <TableHead className="text-right">Összes Adomány</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDonors.map((donor) => (
                    <TableRow key={donor.userId}>
                      <TableCell className="font-medium">#{donor.rank}</TableCell>
                      <TableCell>{donor.userId}</TableCell>
                      <TableCell className="text-right">{donor.amount.toLocaleString()} Ft</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>

        {/* Charity Partners Table */}
        <Card className="cgi-card">
          <div className="cgi-card-header">
            <h3 className="cgi-card-title">Jótékonysági Partnerek</h3>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !charities || charities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Még nincsenek jótékonysági partnerek
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Név</TableHead>
                    <TableHead>Leírás</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead className="text-right">Kapott Összeg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charities.map((charity) => (
                    <TableRow key={charity.id}>
                      <TableCell className="font-medium">{charity.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{charity.description || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${charity.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {charity.is_active ? 'Aktív' : 'Inaktív'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(charity.total_received_huf || 0).toLocaleString()} Ft
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
