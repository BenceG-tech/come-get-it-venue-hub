import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building, Plus, Search, Eye, Phone, Globe, Clock, Grid, List } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { RouteGuard } from '@/components/RouteGuard';
import { PageLayout } from '@/components/PageLayout';
import { VenueFormModal } from '@/components/VenueFormModal';
import { useToast } from '@/hooks/use-toast';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
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
  business_hours?: any;
  image_url?: string | null;
  hero_image_url?: string | null;
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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
      const createData = {
        name: venueData.name,
        address: venueData.address,
        description: venueData.description,
        plan: venueData.plan || 'basic',
        is_paused: venueData.is_paused || false,
        phone_number: venueData.phone_number,
        website_url: venueData.website_url,
      };

      await dataProvider.create('venues', createData);
      
      toast({
        title: "Siker",
        description: "Helyszín sikeresen létrehozva!",
      });

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
      const all = await dataProvider.getList<VenueRow>('venues', {
        search: searchTerm || undefined,
        orderBy: 'created_at',
        orderDir: 'desc',
        limit: 1000,
        offset: 0,
      } as any);

      const header = ['id', 'name', 'address', 'plan', 'is_paused', 'website_url', 'phone_number', 'created_at'];
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

  const getVenueImage = (venue: VenueRow) => venue.image_url || venue.hero_image_url;

  // Compact Mobile Card Component
  const MobileVenueCard = ({ venue }: { venue: VenueRow }) => {
    const image = getVenueImage(venue);
    return (
      <Link to={`/venues/${venue.id}`}>
        <Card className="cgi-card p-3 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            {/* Image Thumbnail */}
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-cgi-muted">
              {image ? (
                <img src={image} alt={venue.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building className="h-6 w-6 text-cgi-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="font-semibold text-sm truncate max-w-[120px]">{venue.name}</span>
                <Badge className={`${planBadgeColor(venue.plan)} capitalize text-[10px] px-1.5 py-0`}>{venue.plan}</Badge>
                <Badge className={`${venue.is_paused ? 'bg-cgi-error text-cgi-error-foreground' : 'bg-cgi-success text-cgi-success-foreground'} text-[10px] px-1.5 py-0`}>
                  {venue.is_paused ? 'Szünetel' : 'Aktív'}
                </Badge>
              </div>
              <p className="text-xs text-cgi-muted-foreground truncate">{venue.address}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-cgi-muted-foreground">
                {venue.phone_number && <Phone className="h-3 w-3" />}
                {venue.website_url && <Globe className="h-3 w-3" />}
                {venue.business_hours && <Clock className="h-3 w-3" />}
                <span className="ml-auto text-[10px]">{new Date(venue.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Action */}
            <Eye className="h-4 w-4 text-cgi-muted-foreground flex-shrink-0" />
          </div>
        </Card>
      </Link>
    );
  };

  // Grid Card Component for Desktop
  const GridVenueCard = ({ venue }: { venue: VenueRow }) => {
    const image = getVenueImage(venue);
    return (
      <Link to={`/venues/${venue.id}`}>
        <Card className="cgi-card overflow-hidden hover:shadow-lg transition-shadow h-full">
          {/* Image */}
          <div className="aspect-[16/10] bg-cgi-muted relative">
            {image ? (
              <img src={image} alt={venue.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building className="h-10 w-10 text-cgi-muted-foreground" />
              </div>
            )}
            <Badge className={`${planBadgeColor(venue.plan)} capitalize absolute top-2 right-2 text-xs`}>
              {venue.plan}
            </Badge>
          </div>
          
          {/* Info */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold truncate text-sm">{venue.name}</span>
            </div>
            <p className="text-xs text-cgi-muted-foreground truncate mb-2">{venue.address}</p>
            <div className="flex items-center justify-between">
              <Badge className={`${venue.is_paused ? 'bg-cgi-error text-cgi-error-foreground' : 'bg-cgi-success text-cgi-success-foreground'} text-xs`}>
                {venue.is_paused ? 'Szünetel' : 'Aktív'}
              </Badge>
              <div className="flex items-center gap-1.5 text-cgi-muted-foreground">
                {venue.phone_number && <Phone className="h-3 w-3" />}
                {venue.website_url && <Globe className="h-3 w-3" />}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="cgi-card overflow-hidden">
                  <div className="aspect-[16/10] bg-cgi-muted animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-cgi-muted animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-cgi-muted animate-pulse rounded w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </PageLayout>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredRoles={['cgi_admin']}>
      <PageLayout>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-cgi-secondary" />
              <div>
                <h1 className="text-2xl font-bold text-cgi-surface-foreground">Helyszínek</h1>
                <p className="text-cgi-muted-foreground text-sm">Venue-k kezelése és beállításai</p>
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

          {/* Filters + View Toggle */}
          <Card className="p-4 cgi-card">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                <Input
                  placeholder="Keresés név vagy cím alapján..."
                  value={searchTerm}
                  onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
                  className="cgi-input pl-10"
                />
              </div>
              {!isMobile && (
                <div className="flex gap-1 border border-cgi-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className={viewMode === 'grid' ? 'cgi-button-primary' : 'cgi-button-ghost'}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    className={viewMode === 'table' ? 'cgi-button-primary' : 'cgi-button-ghost'}
                    onClick={() => setViewMode('table')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Venues Display */}
          {isMobile ? (
            // Mobile: Compact horizontal cards
            <div className="space-y-2">
              {venues.map((venue) => (
                <MobileVenueCard key={venue.id} venue={venue} />
              ))}
              {venues.length === 0 && (
                <Card className="cgi-card">
                  <CardContent className="text-center py-8 text-cgi-muted-foreground">
                    Még nincsenek helyszínek létrehozva.
                  </CardContent>
                </Card>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            // Desktop Grid View
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {venues.map((venue) => (
                  <GridVenueCard key={venue.id} venue={venue} />
                ))}
              </div>
              {venues.length === 0 && (
                <Card className="cgi-card">
                  <CardContent className="text-center py-8 text-cgi-muted-foreground">
                    Még nincsenek helyszínek létrehozva.
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            // Desktop Table View
            <Card className="cgi-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cgi-muted/50">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-cgi-muted-foreground">Kép</th>
                      <th className="text-left p-3 text-xs font-medium text-cgi-muted-foreground">Név</th>
                      <th className="text-left p-3 text-xs font-medium text-cgi-muted-foreground">Cím</th>
                      <th className="text-left p-3 text-xs font-medium text-cgi-muted-foreground">Csomag</th>
                      <th className="text-left p-3 text-xs font-medium text-cgi-muted-foreground">Státusz</th>
                      <th className="text-left p-3 text-xs font-medium text-cgi-muted-foreground">Kontakt</th>
                      <th className="text-left p-3 text-xs font-medium text-cgi-muted-foreground">Létrehozva</th>
                      <th className="text-left p-3 text-xs font-medium text-cgi-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cgi-muted">
                    {venues.map((venue) => {
                      const image = getVenueImage(venue);
                      return (
                        <tr key={venue.id} className="hover:bg-cgi-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-cgi-muted flex-shrink-0">
                              {image ? (
                                <img src={image} alt={venue.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Building className="h-5 w-5 text-cgi-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-medium">{venue.name}</td>
                          <td className="p-3 text-cgi-muted-foreground text-sm max-w-[200px] truncate">{venue.address}</td>
                          <td className="p-3">
                            <Badge className={`${planBadgeColor(venue.plan)} capitalize text-xs`}>{venue.plan}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={`${venue.is_paused ? 'bg-cgi-error text-cgi-error-foreground' : 'bg-cgi-success text-cgi-success-foreground'} text-xs`}>
                              {venue.is_paused ? 'Szünetel' : 'Aktív'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2 text-cgi-muted-foreground">
                              {venue.phone_number && <Phone className="h-4 w-4" />}
                              {venue.website_url && <Globe className="h-4 w-4" />}
                              {!venue.phone_number && !venue.website_url && <span className="text-xs">—</span>}
                            </div>
                          </td>
                          <td className="p-3 text-cgi-muted-foreground text-sm">
                            {new Date(venue.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <Link to={`/venues/${venue.id}`}>
                              <Button variant="ghost" size="sm" className="cgi-button-ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {venues.length === 0 && (
                  <div className="text-center py-8 text-cgi-muted-foreground">
                    Még nincsenek helyszínek létrehozva.
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

export { Venues };
