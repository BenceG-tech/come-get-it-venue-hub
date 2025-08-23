import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, Plus, Search, Eye, Edit } from 'lucide-react';
import { RouteGuard } from '@/components/RouteGuard';
import { PageLayout } from '@/components/PageLayout';
import { Venue } from '@/lib/types';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import { getActiveFreeDrinkStatus, calculateCapUsage } from '@/lib/businessLogic';
import { VenueFormModal } from '@/components/VenueFormModal';

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const dataProvider = getDataProvider();
  const allTags = Array.from(new Set(venues.flatMap(venue => venue.tags)));

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [venues, searchTerm, selectedTags]);

  const loadVenues = async () => {
    try {
      const venueList = await dataProvider.getList<Venue>('venues');
      setVenues(venueList);
    } catch (error) {
      console.error('Error loading venues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterVenues = () => {
    let filtered = venues;

    if (searchTerm) {
      filtered = filtered.filter(venue =>
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(venue =>
        selectedTags.some(tag => venue.tags.includes(tag))
      );
    }

    setFilteredVenues(filtered);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'premium': return 'bg-cgi-secondary text-cgi-secondary-foreground';
      case 'standard': return 'bg-blue-500 text-white';
      case 'basic': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getFreeDrinkStatus = (venue: Venue) => {
    const now = new Date();
    const status = getActiveFreeDrinkStatus(venue, now);
    
    if (venue.is_paused) {
      return { text: 'Szünetel', color: 'bg-red-500 text-white' };
    }
    
    if (status.isActive) {
      return { text: 'Aktív', color: 'bg-green-500 text-white' };
    }
    
    return { text: 'Inaktív', color: 'bg-gray-500 text-white' };
  };

  const getCapStatus = (venue: Venue) => {
    // Mock today's redemptions count
    const todayRedemptions = Math.floor(Math.random() * (venue.caps.daily || 50));
    const usage = calculateCapUsage(venue, todayRedemptions);
    
    return `${usage.used} / ${usage.limit || '∞'}`;
  };

  if (isLoading) {
    return (
      <RouteGuard requiredRoles={['cgi_admin']}>
        <PageLayout>
          <div className="animate-pulse">Betöltés...</div>
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
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="cgi-button-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Új helyszín
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Új helyszín létrehozása</DialogTitle>
                </DialogHeader>
                <VenueFormModal
                  onSave={async (venueData) => {
                    await dataProvider.create('venues', venueData);
                    loadVenues();
                    setIsCreateModalOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card className="p-6 cgi-card">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                  <Input
                    placeholder="Keresés név vagy cím alapján..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="cgi-input pl-10"
                  />
                </div>
              </div>
              
              {allTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-cgi-surface-foreground">Szűrés tag-ek alapján:</p>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className={`cursor-pointer cgi-badge ${
                          selectedTags.includes(tag) ? 'bg-cgi-secondary text-cgi-secondary-foreground' : ''
                        }`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
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
                  <TableHead>Free Drink</TableHead>
                  <TableHead>Ma beváltva / Cap</TableHead>
                  <TableHead>Tag-ek</TableHead>
                  <TableHead>Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVenues.map((venue) => {
                  const freeDrinkStatus = getFreeDrinkStatus(venue);
                  const capStatus = getCapStatus(venue);
                  
                  return (
                    <TableRow key={venue.id}>
                      <TableCell className="font-medium">{venue.name}</TableCell>
                      <TableCell className="text-cgi-muted-foreground">{venue.address}</TableCell>
                      <TableCell>
                        <Badge className={`${getPlanBadgeColor(venue.plan)} capitalize`}>
                          {venue.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={freeDrinkStatus.color}>
                          {freeDrinkStatus.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{capStatus}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {venue.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {venue.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{venue.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link to={`/venues/${venue.id}`}>
                            <Button variant="ghost" size="sm" className="cgi-button-ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="cgi-button-ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {filteredVenues.length === 0 && (
              <div className="text-center py-8 text-cgi-muted-foreground">
                {searchTerm || selectedTags.length > 0 
                  ? 'Nincs a szűrési feltételeknek megfelelő helyszín.'
                  : 'Még nincsenek helyszínek létrehozva.'
                }
              </div>
            )}
          </Card>
        </div>
      </PageLayout>
    </RouteGuard>
  );
}
