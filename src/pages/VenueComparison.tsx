import { PageLayout } from "@/components/PageLayout";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Building, TrendingUp, ArrowUpRight, Eye } from "lucide-react";
import { mockVenueComparisonData, mockComparisonTrend, formatCurrency } from "@/lib/mockData";
import { Link } from "react-router-dom";

export default function VenueComparison() {
  return (
    <PageLayout>
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Venue Összehasonlítás</h1>
          <p className="text-cgi-muted-foreground">
            Helyszínek teljesítményének részletes elemzése és összehasonlítása
          </p>
        </div>

        {/* Venue Comparison Table */}
        <ChartCard 
          title="Venue Teljesítmény Összehasonlítás"
          tooltip="Részletes összehasonlító táblázat az összes helyszín teljesítményéről. A csomagok, bevételek és felhasználói aktivitás alapján rangsorolva."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Helyszín</TableHead>
                  <TableHead>Csomag</TableHead>
                  <TableHead>Havi bevétel</TableHead>
                  <TableHead>Beváltások</TableHead>
                  <TableHead>Átlag kosár</TableHead>
                  <TableHead>Aktív felhasználók</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockVenueComparisonData.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-medium">{venue.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        venue.plan === 'premium' ? 'default' : 
                        venue.plan === 'standard' ? 'secondary' : 'outline'
                      }>
                        {venue.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(venue.monthly_revenue)}</TableCell>
                    <TableCell>{venue.redemptions}</TableCell>
                    <TableCell>{formatCurrency(venue.avg_basket)}</TableCell>
                    <TableCell>{venue.active_users}</TableCell>
                    <TableCell>
                      <Badge variant={venue.is_active ? 'default' : 'destructive'}>
                        {venue.is_active ? 'Aktív' : 'Szünetek'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link to={`/venues/${venue.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Comparison Chart */}
          <ChartCard 
            title="Havi bevétel összehasonlítás"
            tooltip="Vizuális összehasonlítás a helyszínek havi bevételéről. Segít azonosítani a legjobban és leggyengébben teljesítő helyszíneket."
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockVenueComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
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
                  dataKey="monthly_revenue" 
                  fill="#1fb1b7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Redemptions Trend */}
          <ChartCard 
            title="Beváltások trend - Top venues"
            tooltip="A három legjobban teljesítő helyszín beváltási trendjének időbeli alakulása. Hasznos a teljesítménymintázatok és növekedési trendek azonosításához."
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockComparisonTrend}>
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
                  labelFormatter={(label) => new Date(label).toLocaleDateString('hu-HU')}
                />
                <Line 
                  type="monotone" 
                  dataKey="trendy_bar" 
                  stroke="#1fb1b7" 
                  strokeWidth={2}
                  name="Trendy Bar"
                />
                <Line 
                  type="monotone" 
                  dataKey="rooftop_lounge" 
                  stroke="#1fb1b7" 
                  strokeWidth={2}
                  name="Rooftop Lounge"
                />
                <Line 
                  type="monotone" 
                  dataKey="downtown_pub" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Downtown Pub"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Quick Actions */}
        <ChartCard 
          title="Gyors műveletek"
          tooltip="Kapcsolódó funkciók gyors elérése a venue adatok mélyebb elemzéséhez és jelentéskészítéshez."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/venues">
              <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
                <Building className="h-5 w-5 mr-3 text-cgi-secondary" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Venue részletek</p>
                  <p className="text-xs text-cgi-muted-foreground">Egyedi venue adatok</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
              </Button>
            </Link>
            
            <Link to="/analytics">
              <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
                <TrendingUp className="h-5 w-5 mr-3 text-cgi-secondary" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Platform analitika</p>
                  <p className="text-xs text-cgi-muted-foreground">Globális trendek</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
              </Button>
            </Link>
            
            <Button variant="outline" className="w-full h-auto p-4 cgi-button-secondary justify-start">
              <Building className="h-5 w-5 mr-3 text-cgi-secondary" />
              <div className="flex-1 text-left">
                <p className="font-medium">Export jelentés</p>
                <p className="text-xs text-cgi-muted-foreground">PDF/Excel export</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-cgi-muted-foreground" />
            </Button>
          </div>
        </ChartCard>
      </div>
    </PageLayout>
  );
}
