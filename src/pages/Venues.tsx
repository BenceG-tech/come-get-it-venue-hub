import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, Plus, Search, Eye, Phone, Globe } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { RouteGuard } from '@/components/RouteGuard';
import { PageLayout } from '@/components/PageLayout';
import { VenueFormModal } from '@/components/VenueFormModal';
import { useToast } from '@/hooks/use-toast';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import { runtimeConfig } from '@/config/runtime';
import type { Venue } from '@/lib/types';

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
  const [isCreating, setIsCreating] = useState(false);
  const dataProvider = getDataProvider();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a helyszíneket.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVenue = async (venueData: Partial<Venue>) => {
    setIsCreating(true);
    try {
      // Transform the venue data for Supabase
      const createData = {
        name: venueData.name,
        address: venueData.address,
        description: venueData.description,
        plan: venueData.plan || 'basic',
        is_paused: venueData.is_paused || false,
        phone_number: venueData.phone_number,
        website_url: venueData.website_url,
        // Note: owner_profile_id will be set by the backend based on auth.uid()
      };

      await dataProvider.create('venues', createData);
      
      toast({
        title: "Siker",
        description: "Helyszín sikeresen létrehozva!",
      });

      // Refresh the venues list
      setPage(1);
      await loadVenues();
    } catch (error) {
      console.error('Error creating venue:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült létrehozni a helyszínt.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-cgi-secondary" />
              <div>
                <h1 className="text-2xl font-bold text-cgi-surface-foreground">Helyszínek</h1>
                <p className="text-cgi-muted-foreground">Venue-k kezelése és beállításai</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <VenueFormModal
                onSave={handleCreateVenue}
                trigger={
                  <Button className="cgi-button-primary" disabled={isCreating}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isCreating ? 'Létrehozás...' : 'Új helyszín'}
                  </Button>
                }
              />
              <div className="flex gap-2">
                <Button variant="outline" className="cgi-button-secondary flex-1 sm:flex-initial" onClick={() => setPage(1)}>
                  Frissítés
                </Button>
                <Button className="cgi-button-primary flex-1 sm:flex-initial" onClick={exportCSV} disabled={csvExporting}>
                  CSV export
                </Button>
              </div>
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

          {/* Venues Display - Mobile Cards / Desktop Table */}
          {isMobile ? (
            <div className="space-y-4">
              {venues.map((venue) => (
                <Card key={venue.id} className="cgi-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold truncate">{venue.name}</CardTitle>
                        <p className="text-sm text-cgi-muted-foreground mt-1 line-clamp-2">{venue.address}</p>
                      </div>
                      <div className="flex flex-col gap-2 ml-3">
                        <Badge className={`${planBadgeColor(venue.plan)} capitalize text-xs`}>{venue.plan}</Badge>
                        {venue.is_paused ? (
                          <Badge className="bg-cgi-error text-cgi-error-foreground text-xs">Szünetel</Badge>
                        ) : (
                          <Badge className="bg-cgi-success text-cgi-success-foreground text-xs">Aktív</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-col gap-3">
                      {/* Contact Info */}
                      <div className="flex flex-col gap-2">
                        {venue.phone_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-cgi-muted-foreground" />
                            <span className="text-cgi-muted-foreground">{venue.phone_number}</span>
                          </div>
                        )}
                        {venue.website_url && (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="h-4 w-4 text-cgi-muted-foreground" />
                            <a
                              href={venue.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cgi-secondary underline truncate"
                            >
                              Weboldal megnyitása
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* Bottom row */}
                      <div className="flex items-center justify-between pt-2 border-t border-cgi-muted">
                        <span className="text-xs text-cgi-muted-foreground">
                          {new Date(venue.created_at).toLocaleDateString()}
                        </span>
                        <Link to={`/venues/${venue.id}`}>
                          <Button variant="ghost" size="sm" className="cgi-button-ghost">
                            <Eye className="h-4 w-4 mr-1" />
                            Részletek
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {venues.length === 0 && (
                <Card className="cgi-card">
                  <CardContent className="text-center py-8 text-cgi-muted-foreground">
                    {runtimeConfig.useSupabase
                      ? 'Még nincsenek helyszínek létrehozva.'
                      : 'Még nincsenek helyszínek létrehozva.'}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="cgi-card">
              <div className="overflow-x-auto">
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
                      ? 'Még nincsenek helyszínek létrehozva.'
                      : 'Még nincsenek helyszínek létrehozva.'}
                  </div>
                )}
              </div>
            </Card>
          )}
          
          {/* Pagination */}
          <Card className="cgi-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
              <span className="text-sm text-cgi-muted-foreground text-center sm:text-left">Oldal: {page}</span>
              <div className="flex gap-2 justify-center sm:justify-end">
                <Button
                  variant="outline"
                  className="cgi-button-secondary flex-1 sm:flex-initial"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Előző
                </Button>
                <Button
                  variant="outline"
                  className="cgi-button-secondary flex-1 sm:flex-initial"
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
