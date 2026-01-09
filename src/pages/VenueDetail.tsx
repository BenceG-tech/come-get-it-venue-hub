import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CapProgressBar } from '@/components/CapProgressBar';
import { TagInput } from '@/components/TagInput';
import { DrinkSelector } from '@/components/DrinkSelector';
import { TimeRangeInput } from '@/components/TimeRangeInput';
import { VenueFormModal } from '@/components/VenueFormModal';
import { ChartCard } from '@/components/ChartCard';
import { KPICard } from '@/components/KPICard';
import { VenueImageGallery } from '@/components/VenueImageGallery';
import ScheduleGrid from '@/components/ScheduleGrid';
import BusinessHoursEditor from '@/components/BusinessHoursEditor';
import { MerchantMatchRulesManager } from '@/components/MerchantMatchRulesManager';
import { Building, Clock, Users, TrendingUp, Settings, Edit, Pause, Play, MapPin, Phone, Globe, ArrowLeft, Info, CreditCard } from 'lucide-react';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import { seedData } from '@/lib/mock/seed';
import { 
  getActiveFreeDrinkStatus, 
  getNextActiveWindow, 
  calculateCapUsage,
  formatCurrency,
  isVenueOpenNow,
  getClosingTimeToday
} from '@/lib/businessLogic';
import { Venue, FreeDrinkWindow, BusinessHours } from '@/lib/types';
import { FeatureGate } from '@/components/FeatureGate';
import { useToast } from '@/hooks/use-toast';
import { runtimeConfig } from '@/config/runtime';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const { toast } = useToast();

  const dataProvider = getDataProvider();

  useEffect(() => {
    const loadVenue = async () => {
      setIsLoading(true);
      try {
        if (!id) throw new Error("Venue ID is missing");
        const venueData = await dataProvider.getOne<Venue>('venues', id);
        setVenue(venueData);
        setIsPaused(venueData.is_paused);
      } catch (error: any) {
        console.error("Failed to load venue:", error);
        toast({ title: "Hiba", description: String(error?.message || error), variant: "destructive" as any });
      } finally {
        setIsLoading(false);
      }
    };

    loadVenue();
    // Seed only when NOT using Supabase
    if (!runtimeConfig.useSupabase) {
      seedData();
    }
  }, [id]);

  // Business logic calculations with proper null checks
  const now = useMemo(() => new Date(), []);
  const openNow = useMemo(() => venue ? isVenueOpenNow(venue, now) : false, [venue, now]);
  const closesAt = useMemo(() => venue ? getClosingTimeToday(venue, now) : null, [venue, now]);
  const activeFreeDrinkStatus = useMemo(() => venue ? getActiveFreeDrinkStatus(venue, now) : { isActive: false }, [venue, now]);
  const nextWindow = useMemo(() => venue ? getNextActiveWindow(venue, now) : null, [venue, now]);
  const mockRedemptionCount = 50; // This should come from actual data
  const capUsage = useMemo(() => venue ? calculateCapUsage(venue, mockRedemptionCount) : { used: 0, limit: 0, pct: 0 }, [venue, mockRedemptionCount]);

  // Add null check for venue.images to prevent the error
  const coverImage = useMemo(() => {
    if (!venue?.images?.length) return null;
    return venue.images.find(i => i.isCover) || venue.images[0];
  }, [venue?.images]);

  const handlePauseToggle = async () => {
    if (!venue) return;

    const updatedVenue = { ...venue, is_paused: !isPaused };

    try {
      await dataProvider.update<Venue>('venues', venue.id, { is_paused: !isPaused });
      setVenue(updatedVenue);
      setIsPaused(!isPaused);
    } catch (error: any) {
      console.error("Failed to update venue pause status:", error);
      toast({ title: "Hiba", description: String(error?.message || error), variant: "destructive" as any });
    }
  };

  const handleVenueSave = async (updates: Partial<Venue>) => {
    if (!venue) return;

    try {
      const saved = await dataProvider.update<Venue>('venues', venue.id, updates);
      
      // Re-fetch the venue to ensure we have the latest data from the server
      const refreshedVenue = await dataProvider.getOne<Venue>('venues', venue.id);
      setVenue(refreshedVenue);
      
      toast({ 
        title: 'Siker', 
        description: refreshedVenue.drinks?.length ? 
          `Változások elmentve. ${refreshedVenue.drinks.length} ital mentve.` : 
          'Változások elmentve.'
      });
      return refreshedVenue;
    } catch (error: any) {
      console.error("Failed to update venue:", error);
      toast({ title: "Hiba", description: String(error?.message || error), variant: "destructive" as any });
      throw error;
    }
  };

  const handleBusinessHoursSave = async (businessHours: BusinessHours) => {
    if (!venue) return;
    
    try {
      const updates = { business_hours: businessHours };
      await dataProvider.update<Venue>('venues', venue.id, updates);
      setVenue(prev => prev ? { ...prev, business_hours: businessHours } : null);
    } catch (error: any) {
      console.error("Failed to update business hours:", error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="text-cgi-surface-foreground">Loading...</div>
      </PageLayout>
    );
  }

  if (!venue) {
    return (
      <PageLayout>
        <div className="text-cgi-surface-foreground">Venue not found</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/venues')}
          className="text-cgi-surface-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza a helyszínekhez
        </Button>
      </div>

      <div className="mb-8 flex flex-col lg:flex-row items-start justify-between gap-4" data-tour="venue-header">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">{venue.name}</h1>
          <p className="text-cgi-muted-foreground">
            {venue.address}
            {venue.description && <>&nbsp;•&nbsp;{venue.description}</>}
          </p>
          
          {/* Open/Closed Status */}
          <div className="mt-1 text-sm text-cgi-muted-foreground">
            {openNow ? (
              <span className="text-green-600">Nyitva • Zárás {closesAt ?? '—'}</span>
            ) : (
              <span className="text-red-600">Zárva</span>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 text-sm text-cgi-muted-foreground">
            {venue.phone_number && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>{venue.phone_number}</span>
              </div>
            )}
            {venue.website_url && (
              <a href={venue.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-cgi-primary">
                <Globe className="h-4 w-4" />
                <span>Weboldal</span>
              </a>
            )}
          </div>

          {/* Map Link */}
          {venue.coordinates && (
            <div className="mt-2">
              <a
                className="text-sm underline text-cgi-secondary flex items-center gap-1"
                href={`https://www.google.com/maps/dir/?api=1&destination=${venue.coordinates.lat},${venue.coordinates.lng}`}
                target="_blank" 
                rel="noreferrer"
              >
                <MapPin className="h-4 w-4" />
                Útvonalterv
              </a>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {venue.tags?.map(tag => (
              <Badge key={tag} className="cgi-badge bg-cgi-secondary text-cgi-secondary-foreground">{tag}</Badge>
            )) || []}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-4 w-full lg:w-auto">
          <FeatureGate requiredRoles={['cgi_admin', 'venue_owner']} fallback={<div />}>
            <VenueFormModal 
              venue={venue} 
              onSave={handleVenueSave}
              trigger={
                <Button className="cgi-button-primary" data-tour="edit-button">
                  <Edit className="h-4 w-4 mr-2" />
                  Szerkesztés
                </Button>
              }
            />
          </FeatureGate>
          
          <FeatureGate requiredRoles={['cgi_admin', 'venue_owner']} fallback={
            <Button variant="outline" size="sm" className="cgi-button-secondary" disabled>
              <Pause className="h-4 w-4 mr-2" />
              Szüneteltetés
            </Button>
          }>
            <Button 
              variant={isPaused ? 'default' : 'destructive'} 
              className={isPaused ? 'cgi-button-primary' : 'cgi-button-error'}
              onClick={handlePauseToggle}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Folytatás
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Szüneteltetés
                </>
              )}
            </Button>
          </FeatureGate>
        </div>
      </div>

      <div className="space-y-6">
        {/* Image Gallery */}
        {(() => {
          const hasDbImages = Array.isArray(venue.images) && venue.images.length > 0;
          const syntheticImages = !hasDbImages && (venue.hero_image_url || venue.image_url)
            ? [
                {
                  id: 'cover',
                  url: (venue.hero_image_url || venue.image_url) as string,
                  label: 'Borítókép',
                  isCover: true,
                },
              ]
            : [];
          const galleryImages = hasDbImages ? (venue.images as NonNullable<Venue['images']>) : syntheticImages;
          
          return galleryImages.length > 0 ? (
            <VenueImageGallery 
              images={galleryImages} 
              venueName={venue.name} 
            />
          ) : null;
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-tour="kpi-cards">
          <KPICard 
            title="Mai forgalom" 
            value={formatCurrency(123456)} 
            icon={TrendingUp}
          />
          <KPICard 
            title="Mai ingyenes italok" 
            value="89" 
            icon={Users}
          />
          <div className="relative">
            <KPICard 
              title="Aktív vendégek" 
              value="42" 
              icon={Building}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="absolute top-2 right-2 text-cgi-muted-foreground hover:text-cgi-surface-foreground"
                    aria-label="Mit jelent az Aktív vendégek?"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-cgi-surface border-cgi-muted text-cgi-surface-foreground max-w-xs">
                  Az elmúlt órában aktivitást mutató vendégek becsült száma (pl. beváltások, vásárlások vagy interakciók alapján).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <KPICard 
            title="Következő akció" 
            value={nextWindow ? `${nextWindow.start} - ${nextWindow.end}` : 'Nincs ütemezett akció'}
            icon={Clock}
          />
        </div>

        <Tabs defaultValue="free-drinks" className="w-full">
          <TabsList className="grid w-full grid-cols-4 cgi-tabs-list">
            <TabsTrigger value="free-drinks" className="cgi-tabs-trigger" data-tour="free-drinks-tab">
              Ingyenes italok
            </TabsTrigger>
            <TabsTrigger value="business-hours" className="cgi-tabs-trigger">
              Nyitvatartás
            </TabsTrigger>
            <TabsTrigger value="analytics" className="cgi-tabs-trigger">
              Elemzések
            </TabsTrigger>
            <TabsTrigger value="settings" className="cgi-tabs-trigger">
              Beállítások
            </TabsTrigger>
          </TabsList>

          {/* Free Drinks Tab */}
          <TabsContent value="free-drinks" className="space-y-4">
            <Card className="cgi-card p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-cgi-surface-foreground">
                      Ingyenes italok ({venue.drinks?.filter(d => d.is_free_drink).length || 0})
                    </h3>
                    <p className="text-sm text-cgi-muted-foreground mt-1">
                      Aktuális státusz: {activeFreeDrinkStatus.isActive ? (
                        <span className="text-green-600 font-medium">Aktív ajánlat</span>
                      ) : (
                        <span className="text-cgi-muted-foreground">Nincs aktív ajánlat</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Current Free Drinks List */}
                {venue.drinks && venue.drinks.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-cgi-surface-foreground">Elérhető italok</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {venue.drinks.map(drink => (
                        <Card key={drink.id} className="cgi-card p-4">
                          <div className="flex gap-4">
                            {drink.image_url && (
                              <img 
                                src={drink.image_url} 
                                alt={drink.drinkName}
                                className="w-20 h-20 object-cover rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="font-medium text-cgi-surface-foreground">{drink.drinkName}</h5>
                                  {drink.category && (
                                    <Badge className="mt-1 cgi-badge bg-cgi-muted text-cgi-muted-foreground">
                                      {drink.category}
                                    </Badge>
                                  )}
                                </div>
                                {drink.is_free_drink && (
                                  <Badge className="cgi-badge bg-green-500/10 text-green-700 border-green-500/20">
                                    Ingyenes
                                  </Badge>
                                )}
                              </div>
                              {drink.description && (
                                <p className="text-xs text-cgi-muted-foreground mt-2 line-clamp-2">
                                  {drink.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-cgi-muted-foreground">
                    <p>Még nincs ital hozzáadva ehhez a helyszínhez.</p>
                  </div>
                )}

                {/* Free Drink Schedule Grid */}
                {venue.freeDrinkWindows && venue.freeDrinkWindows.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-cgi-surface-foreground">
                      Ingyenes ital időbeosztás
                    </h4>
                    <Card className="cgi-card p-4">
                      <ScheduleGrid windows={venue.freeDrinkWindows} />
                    </Card>
                    
                    {/* Time Windows Details */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-cgi-surface-foreground">Időablakok részletei</h5>
                      <div className="space-y-2">
                        {venue.freeDrinkWindows.map((window, idx) => {
                          const drinkName = venue.drinks?.find(d => d.id === window.drink_id)?.drinkName;
                          const dayLabels = window.days.map(d => ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'][d-1]).join(', ');
                          return (
                            <div key={window.id || idx} className="flex items-center gap-2 text-sm p-2 bg-cgi-muted/20 rounded">
                              <Clock className="h-4 w-4 text-cgi-primary" />
                              <span className="font-medium text-cgi-surface-foreground">
                                {drinkName || 'Ital'}:
                              </span>
                              <span className="text-cgi-muted-foreground">
                                {dayLabels} • {window.start} - {window.end}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Active Window Info */}
                {nextWindow && !activeFreeDrinkStatus.isActive && (
                  <Card className="cgi-card p-4 bg-blue-50/50 border-blue-200">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-blue-900">Következő ajánlat</h5>
                        <p className="text-sm text-blue-700 mt-1">
                          {nextWindow.start} - {nextWindow.end}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Business Hours Tab */}
          <TabsContent value="business-hours">
            <Card className="cgi-card p-6">
              <BusinessHoursEditor
                initialHours={venue.business_hours}
                onSave={handleBusinessHoursSave}
              />
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="cgi-card p-6">
              <h3 className="text-lg font-semibold text-cgi-surface-foreground mb-4">
                Forgalmi statisztika
              </h3>
              <p className="text-sm text-cgi-muted-foreground">
                Az elemzések hamarosan elérhetők lesznek.
              </p>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="cgi-card p-6">
              <h3 className="text-lg font-semibold text-cgi-surface-foreground mb-6">
                Helyszín beállítások
              </h3>
              
              <div className="space-y-6">
                {/* Pause Control */}
                <div className="flex items-center justify-between pb-4 border-b border-cgi-border">
                  <div>
                    <Label className="text-cgi-surface-foreground font-medium">Helyszín státusza</Label>
                    <p className="text-sm text-cgi-muted-foreground mt-1">
                      {isPaused ? 'A helyszín jelenleg szünetel' : 'A helyszín jelenleg aktív'}
                    </p>
                  </div>
                  <Switch checked={!isPaused} onCheckedChange={() => handlePauseToggle()} />
                </div>

                {/* Merchant Rules */}
                <div className="pb-4 border-b border-cgi-border">
                  <Label className="text-cgi-surface-foreground font-medium flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4" />
                    Banki egyeztetési szabályok
                  </Label>
                  <MerchantMatchRulesManager 
                    venue={venue} 
                    onUpdate={async () => {
                      try {
                        const refreshedVenue = await dataProvider.getOne<Venue>('venues', venue.id);
                        setVenue(refreshedVenue);
                      } catch (error) {
                        console.error('Failed to refresh venue:', error);
                      }
                    }} 
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label className="text-cgi-surface-foreground font-medium mb-3 block">
                    Címkék
                  </Label>
                  <TagInput
                    tags={venue.tags || []}
                    onChange={(tags) => handleVenueSave({ tags })}
                    placeholder="Adj hozzá címkéket..."
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
