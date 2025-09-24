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
import ScheduleGrid from '@/components/ScheduleGrid';
import BusinessHoursEditor from '@/components/BusinessHoursEditor';
import VenueLocationManager from '@/components/VenueLocationManager';
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
      const updatedVenue = { ...venue, ...updates };
      await dataProvider.update<Venue>('venues', venue.id, updates);
      setVenue(updatedVenue);
    } catch (error: any) {
      console.error("Failed to update venue:", error);
      toast({ title: "Hiba", description: String(error?.message || error), variant: "destructive" as any });
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

      <div className="mb-8 flex flex-col lg:flex-row items-start justify-between gap-4">
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
                <Button variant="outline" className="cgi-button-secondary">
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

          {/* Image Gallery - Fixed null check */}
          {venue.images?.length ? (
            <Card className="cgi-card mb-6">
              <div className="space-y-3">
                <img
                  src={coverImage?.url || 'https://via.placeholder.com/800x400?text=No+Image'}
                  alt={venue.name}
                  className="w-full h-48 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/800x400?text=No+Image';
                  }}
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {venue.images.map(img => (
                    <img 
                      key={img.id} 
                      src={img.url} 
                      alt={img.label || 'image'} 
                      className="h-16 w-24 object-cover rounded-md border border-cgi-muted cursor-pointer hover:opacity-80" 
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/96x64?text=No+Image';
                      }}
                    />
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="w-full bg-cgi-muted overflow-x-auto">
              <div className="flex min-w-max">
                <TabsTrigger value="analytics" className="text-cgi-surface-foreground whitespace-nowrap">Analitika</TabsTrigger>
                <TabsTrigger value="management" className="text-cgi-surface-foreground whitespace-nowrap">Kezelés</TabsTrigger>
                <TabsTrigger value="integration" className="text-cgi-surface-foreground whitespace-nowrap">Integráció</TabsTrigger>
                <TabsTrigger value="settings" className="text-cgi-surface-foreground whitespace-nowrap">Beállítások</TabsTrigger>
              </div>
            </TabsList>
            
            <TabsContent value="analytics" className="space-y-4">
              <ChartCard title="Forgalom alakulása">
                <div className="h-64 flex items-center justify-center text-cgi-muted-foreground">
                  Chart placeholder - forgalom alakulása
                </div>
              </ChartCard>
            </TabsContent>

            <TabsContent value="management" className="space-y-4">
              <Card className="cgi-card bg-cgi-surface border-cgi-muted">
                <div className="cgi-card-header">
                  <h3 className="cgi-card-title text-cgi-surface-foreground">Napi limitek</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-cgi-surface-foreground">Napi limit</Label>
                      <span className="text-sm text-cgi-muted-foreground">
                        {capUsage.used} / {capUsage.limit}
                      </span>
                    </div>
                    <CapProgressBar usage={capUsage} />
                  </div>
                </div>
              </Card>

              <Card className="cgi-card bg-cgi-surface border-cgi-muted">
                <div className="cgi-card-header">
                  <h3 className="cgi-card-title text-cgi-surface-foreground">Ingyenes ital időablakok</h3>
                </div>
                <div className="p-4">
                  <ScheduleGrid windows={venue.freeDrinkWindows || []} />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="integration" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FeatureGate requiredRoles={['cgi_admin', 'venue_owner']}>
                  <VenueLocationManager 
                    venue={venue}
                    onUpdate={() => {
                      // Optionally reload venue data
                      console.log('Venue locations updated');
                    }}
                  />
                </FeatureGate>
                
                <Card className="cgi-card">
                  <div className="cgi-card-header">
                    <h3 className="cgi-card-title flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Fidel Integráció Állapota
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-cgi-success/10 rounded-lg border border-cgi-success/20">
                      <div>
                        <div className="font-medium text-cgi-success">Webhook aktív</div>
                        <div className="text-sm text-cgi-muted-foreground">
                          A Fidel tranzakciók automatikusan feldolgozásra kerülnek
                        </div>
                      </div>
                      <Badge className="bg-cgi-success/20 text-cgi-success">
                        Működik
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-cgi-muted-foreground">
                      <p className="mb-2">
                        <strong>Webhook URL:</strong><br />
                        <code className="bg-cgi-muted px-2 py-1 rounded text-xs">
                          https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/fidel-webhook
                        </code>
                      </p>
                      <p>
                        Ezt az URL-t használd a Fidel Dashboard-ban a webhook beállításánál.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FeatureGate requiredRoles={['cgi_admin', 'venue_owner']}>
                  <BusinessHoursEditor
                    initialHours={venue.business_hours}
                    onSave={handleBusinessHoursSave}
                  />
                </FeatureGate>
                
                <Card className="cgi-card bg-cgi-surface border-cgi-muted">
                  <div className="cgi-card-header">
                    <h3 className="cgi-card-title text-cgi-surface-foreground">Alapbeállítások</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue-name" className="text-cgi-surface-foreground">Helyszín neve</Label>
                      <input
                        type="text"
                        id="venue-name"
                        className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                        value={venue.name}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-address" className="text-cgi-surface-foreground">Cím</Label>
                      <input
                        type="text"
                        id="venue-address"
                        className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                        value={venue.address}
                        readOnly
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}
