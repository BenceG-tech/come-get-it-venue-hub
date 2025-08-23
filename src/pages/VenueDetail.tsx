
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Building, ArrowLeft, Clock, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { RouteGuard } from '@/components/RouteGuard';
import { FeatureGate } from '@/components/FeatureGate';
import { CapProgressBar } from '@/components/CapProgressBar';
import { Venue } from '@/lib/types';
import { dataProvider } from '@/lib/dataProvider/localStorageProvider';
import { sessionManager } from '@/auth/mockSession';
import { getActiveFreeDrinkStatus, getNextActiveWindow, calculateCapUsage, formatCurrency } from '@/lib/businessLogic';

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (id) {
      loadVenue(id);
    }
  }, [id]);

  const loadVenue = async (venueId: string) => {
    try {
      const venueData = await dataProvider.getOne<Venue>('venues', venueId);
      setVenue(venueData);
    } catch (error) {
      console.error('Error loading venue:', error);
      navigate('/venues');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFreeDrink = async () => {
    if (!venue) return;
    
    setIsToggling(true);
    try {
      const updatedVenue = await dataProvider.update<Venue>('venues', venue.id, {
        is_paused: !venue.is_paused
      });
      setVenue(updatedVenue);
    } catch (error) {
      console.error('Error toggling free drink:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const canEdit = () => {
    if (!venue) return false;
    return sessionManager.canEditVenue(venue.id);
  };

  if (isLoading) {
    return (
      <RouteGuard>
        <div className="cgi-page">
          <div className="animate-pulse">Betöltés...</div>
        </div>
      </RouteGuard>
    );
  }

  if (!venue) {
    return (
      <RouteGuard>
        <div className="cgi-page">
          <div className="text-center py-8">
            <p className="text-cgi-muted-foreground">Helyszín nem található.</p>
            <Button onClick={() => navigate('/venues')} className="mt-4 cgi-button-primary">
              Vissza a helyszínekhez
            </Button>
          </div>
        </div>
      </RouteGuard>
    );
  }

  const now = new Date();
  const freeDrinkStatus = getActiveFreeDrinkStatus(venue, now);
  const nextWindow = getNextActiveWindow(venue, now);
  const todayRedemptions = Math.floor(Math.random() * (venue.caps.daily || 50));
  const capUsage = calculateCapUsage(venue, todayRedemptions);

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'premium': return 'bg-cgi-secondary text-cgi-secondary-foreground';
      case 'standard': return 'bg-blue-500 text-white';
      case 'basic': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <RouteGuard>
      <div className="cgi-page">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/venues')}
              variant="ghost"
              size="sm"
              className="cgi-button-ghost"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vissza
            </Button>
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-cgi-secondary" />
              <div>
                <h1 className="text-2xl font-bold text-cgi-surface-foreground">{venue.name}</h1>
                <p className="text-cgi-muted-foreground">{venue.address}</p>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Drink Status */}
            <Card className="p-6 cgi-card">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-cgi-surface-foreground">Ingyenes Ital Státusz</h3>
                  {canEdit() && (
                    <Switch
                      checked={!venue.is_paused}
                      onCheckedChange={toggleFreeDrink}
                      disabled={isToggling}
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  {venue.is_paused ? (
                    <Badge className="bg-red-500 text-white">Szüneteltetve</Badge>
                  ) : freeDrinkStatus.isActive ? (
                    <Badge className="bg-green-500 text-white">Aktív most</Badge>
                  ) : (
                    <Badge className="bg-gray-500 text-white">Jelenleg inaktív</Badge>
                  )}
                  
                  {nextWindow && !venue.is_paused && (
                    <div className="text-sm text-cgi-muted-foreground">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Következő: {nextWindow.start} - {nextWindow.end}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Today's Stats */}
            <Card className="p-6 cgi-card">
              <div className="space-y-4">
                <h3 className="font-semibold text-cgi-surface-foreground">Ma</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-cgi-muted-foreground">Beváltások</span>
                    <span className="font-bold text-lg">{todayRedemptions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cgi-muted-foreground">Forgalom</span>
                    <span className="font-bold text-lg">{formatCurrency(todayRedemptions * 850)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cgi-muted-foreground">Aktív felhasználók</span>
                    <span className="font-bold text-lg">{Math.floor(todayRedemptions * 0.8)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Cap Status */}
            <Card className="p-6 cgi-card">
              <div className="space-y-4">
                <h3 className="font-semibold text-cgi-surface-foreground">Kapacitás</h3>
                <CapProgressBar usage={capUsage} label="Napi limit" />
                
                {capUsage.pct >= 90 && venue.caps.onExhaust === 'show_alt_offer' && venue.caps.altOfferText && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-cgi-surface-foreground">Alternatív ajánlat</p>
                        <p className="text-sm text-cgi-muted-foreground">{venue.caps.altOfferText}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Áttekintés</TabsTrigger>
              <TabsTrigger value="drinks">Italok</TabsTrigger>
              <TabsTrigger value="schedule">Időbeosztás</TabsTrigger>
              <TabsTrigger value="caps">Limitek</TabsTrigger>
              <TabsTrigger value="meta">Meta</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 cgi-card">
                  <h3 className="font-semibold text-cgi-surface-foreground mb-4">Heti trend</h3>
                  <div className="space-y-3">
                    {['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'].map((day, index) => {
                      const value = Math.floor(Math.random() * 100);
                      return (
                        <div key={day} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{day}</span>
                            <span>{value} beváltás</span>
                          </div>
                          <Progress value={value} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <FeatureGate requiredPlans={['standard', 'premium']} venue={venue}>
                  <Card className="p-6 cgi-card">
                    <h3 className="font-semibold text-cgi-surface-foreground mb-4">Felhasználói aktivitás</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-cgi-muted-foreground">Új felhasználók</span>
                        <span className="font-bold">34</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-cgi-muted-foreground">Visszatérő</span>
                        <span className="font-bold">55</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-cgi-muted-foreground">Átlag. látogatás</span>
                        <span className="font-bold">2.3x/hét</span>
                      </div>
                    </div>
                  </Card>
                </FeatureGate>
              </div>
            </TabsContent>

            <TabsContent value="drinks" className="space-y-4">
              <Card className="p-6 cgi-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-cgi-surface-foreground">Italok ({venue.drinks.length})</h3>
                  {canEdit() && (
                    <Button size="sm" className="cgi-button-primary">Szerkesztés</Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {venue.drinks.map((drink) => (
                    <div key={drink.id} className="flex items-center justify-between p-3 bg-cgi-muted/10 rounded-lg">
                      <div>
                        <span className="font-medium">{drink.drinkName}</span>
                        {drink.category && (
                          <Badge variant="outline" className="ml-2 text-xs">{drink.category}</Badge>
                        )}
                        {drink.is_free_drink && (
                          <Badge className="ml-2 text-xs bg-green-500 text-white">Ingyenes</Badge>
                        )}
                        {drink.is_sponsored && (
                          <Badge className="ml-2 text-xs bg-blue-500 text-white">Szponzorált</Badge>
                        )}
                      </div>
                      {drink.abv && (
                        <span className="text-sm text-cgi-muted-foreground">{drink.abv}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card className="p-6 cgi-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-cgi-surface-foreground">Ingyenes ital időablakok</h3>
                  {canEdit() && (
                    <Button size="sm" className="cgi-button-primary">Szerkesztés</Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {venue.freeDrinkWindows.map((window) => (
                    <div key={window.id} className="p-4 bg-cgi-muted/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{window.start} - {window.end}</span>
                        <Badge variant="outline" className="text-xs">{window.timezone}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {window.days.map(day => {
                          const dayNames = ['', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
                          return (
                            <Badge key={day} variant="secondary" className="text-xs">
                              {dayNames[day]}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="caps" className="space-y-4">
              <Card className="p-6 cgi-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-cgi-surface-foreground">Limitek és szabályok</h3>
                  {canEdit() && (
                    <Button size="sm" className="cgi-button-primary">Szerkesztés</Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-cgi-muted-foreground">Napi limit:</span>
                      <span className="font-medium">{venue.caps.daily || 'Nincs'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cgi-muted-foreground">Óránkénti limit:</span>
                      <span className="font-medium">{venue.caps.hourly || 'Nincs'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cgi-muted-foreground">Havi limit:</span>
                      <span className="font-medium">{venue.caps.monthly || 'Nincs'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cgi-muted-foreground">Felhasználónkénti napi:</span>
                      <span className="font-medium">{venue.caps.perUserDaily || 'Nincs'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-cgi-muted-foreground">Elfogyás esetén:</span>
                      <Badge variant="outline" className="ml-2">
                        {venue.caps.onExhaust === 'close' && 'Bezárás'}
                        {venue.caps.onExhaust === 'show_alt_offer' && 'Alt. ajánlat'}
                        {venue.caps.onExhaust === 'do_nothing' && 'Folytatás'}
                      </Badge>
                    </div>
                    {venue.caps.altOfferText && (
                      <div className="p-3 bg-cgi-muted/10 rounded-lg">
                        <p className="text-sm font-medium">Alternatív ajánlat:</p>
                        <p className="text-sm text-cgi-muted-foreground">{venue.caps.altOfferText}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="meta" className="space-y-4">
              <Card className="p-6 cgi-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-cgi-surface-foreground">Meta információk</h3>
                  {canEdit() && (
                    <Button size="sm" className="cgi-button-primary">Szerkesztés</Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-cgi-surface-foreground font-medium">Csomag</Label>
                    <Badge className={`ml-2 ${getPlanBadgeColor(venue.plan)} capitalize`}>
                      {venue.plan}
                    </Badge>
                  </div>
                  
                  {venue.description && (
                    <div>
                      <Label className="text-cgi-surface-foreground font-medium">Leírás</Label>
                      <p className="text-cgi-muted-foreground mt-1">{venue.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-cgi-surface-foreground font-medium">Tag-ek</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {venue.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  {venue.api_key && (
                    <div>
                      <Label className="text-cgi-surface-foreground font-medium">API Kulcs</Label>
                      <code className="block mt-1 p-2 bg-cgi-muted/10 rounded text-sm font-mono">
                        {venue.api_key}
                      </code>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RouteGuard>
  );
}
