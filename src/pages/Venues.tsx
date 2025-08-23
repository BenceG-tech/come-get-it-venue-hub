
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, Plus, Search, Eye } from 'lucide-react';
import { RouteGuard } from '@/components/RouteGuard';
import { PageLayout } from '@/components/PageLayout';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import { runtimeConfig } from '@/config/runtime';

type VenueRow = {
  id: string;
  name: string;
  address: string;
  plan: 'basic' | 'standard' | 'premium';
  is_paused: boolean;
  website_url?: string | null;
  phone_number?: string | null;
  created_at: string;
};

const PAGE_SIZE = 20;

export default function Venues() {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [csvExporting, setCsvExporting] = useState(false);
  const dataProvider = getDataProvider();

  useEffect(() => {
    loadVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page]);

  const offset = useMemo(() => (page - 1) * PAGE_SIZE, [page]);

  const loadVenues = async () => {
    setIsLoading(true);
    try {
      // Fetch PAGE_SIZE + 1 to detect "has more"
      const rows = await dataProvider.getList<VenueRow>('venues', {
        search: searchTerm || undefined,
        orderBy: 'created_at',
        orderDir: 'desc',
        limit: PAGE_SIZE + 1,
        offset,
      } as any);
      setHasMore(rows.length > PAGE_SIZE);
      setVenues(rows.slice(0, PAGE_SIZE));
    } catch (error) {
      console.error('Error loading venues:', error);
      setVenues([]);
    } finally {
      setIsLoading(false);
    }
  };

  const planBadgeColor = (plan: VenueRow['plan']) => {
    switch (plan) {
      case 'premium':
        return 'bg-cgi-secondary text-cgi-secondary-foreground';
      case 'standard':
        return 'bg-cgi-primary/10 text-cgi-primary border border-cgi-primary/30';
      case 'basic':
      default:
        return 'bg-cgi-muted text-cgi-muted-foreground';
    }
  };

  const exportCSV = async () => {
    setCsvExporting(true);
    try {
      // Export using current search filter, without pagination
      const all = await dataProvider.getList<VenueRow>('venues', {
        search: searchTerm || undefined,
        orderBy: 'created_at',
        orderDir: 'desc',
        limit: 1000, // simple cap for client-side export
        offset: 0,
      } as any);

      const header = [
        'id',
        'name',
        'address',
        'plan',
        'is_paused',
        'website_url',
        'phone_number',
        'created_at',
      ];
      const lines = [
        header.join(','),
        ...all.map(v =>
          [
            v.id,
            `"${(v.name || '').replace(/"/g, '""')}"`,
            `"${(v.address || '').replace(/"/g, '""')}"`,
            v.plan,
            v.is_paused,
            v.website_url || '',
            v.phone_number || '',
            v.created_at,
          ].join(',')
        ),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'venues.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export failed:', error);
    } finally {
      setCsvExporting(false);
    }
  };

  if (isLoading) {
    return (
      <RouteGuard requiredRoles={['cgi_admin']}>
        <PageLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-cgi-secondary" />
                <div>
                  <h1 className="text-2xl font-bold text-cgi-surface-foreground">Helyszínek</h1>
                  <p className="text-cgi-muted-foreground">Betöltés...</p>
                </div>
              </div>
            </div>
            <Card className="cgi-card p-6">
              <div className="h-32 animate-pulse bg-cgi-muted rounded" />
            </Card>
          </div>
        </PageLayout>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredRoles={['cgi_admin']}>
      <PageLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-cgi-secondary" />
              <div>
                <h1 className="text-2xl font-bold text-cgi-surface-foreground">Helyszínek</h1>
                <p className="text-cgi-muted-foreground">Venue-k kezelése és beállításai</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="cgi-button-secondary" onClick={() => setPage(1)}>
                Frissítés
              </Button>
              <Button className="cgi-button-primary" onClick={exportCSV} disabled={csvExporting}>
                CSV export
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-6 cgi-card">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                <Input
                  placeholder="Keresés név vagy cím alapján..."
                  value={searchTerm}
                  onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
                  className="cgi-input pl-10"
                />
              </div>
            </div>
          </Card>

          {/* Venues Table */}
          <Card className="cgi-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Név</TableHead>
                  <TableHead>Cím</TableHead>
                  <TableHead>Csomag</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Web</TableHead>
                  <TableHead>Létrehozva</TableHead>
                  <TableHead>Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-medium">{venue.name}</TableCell>
                    <TableCell className="text-cgi-muted-foreground">{venue.address}</TableCell>
                    <TableCell>
                      <Badge className={`${planBadgeColor(venue.plan)} capitalize`}>{venue.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      {venue.is_paused ? (
                        <Badge className="bg-cgi-error text-cgi-error-foreground">Szünetel</Badge>
                      ) : (
                        <Badge className="bg-cgi-success text-cgi-success-foreground">Aktív</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-cgi-muted-foreground">{venue.phone_number || '—'}</TableCell>
                    <TableCell>
                      {venue.website_url ? (
                        <a
                          href={venue.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cgi-secondary underline"
                        >
                          Megnyitás
                        </a>
                      ) : (
                        <span className="text-cgi-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-cgi-muted-foreground">
                      {new Date(venue.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/venues/${venue.id}`}>
                          <Button variant="ghost" size="sm" className="cgi-button-ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {venues.length === 0 && (
              <div className="text-center py-8 text-cgi-muted-foreground">
                {runtimeConfig.useSupabase
                  ? 'No venues yet'
                  : 'Még nincsenek helyszínek létrehozva.'}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-cgi-muted-foreground">Oldal: {page}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="cgi-button-secondary"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Előző
                </Button>
                <Button
                  variant="outline"
                  className="cgi-button-secondary"
                  disabled={!hasMore}
                  onClick={() => setPage(p => p + 1)}
                >
                  Következő
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </PageLayout>
    </RouteGuard>
  );
}
