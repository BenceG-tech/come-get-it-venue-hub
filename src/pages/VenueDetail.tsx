
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
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
import { Building, Clock, Users, TrendingUp, Settings, Edit, Pause, Play } from 'lucide-react';
import { dataProvider } from '@/lib/dataProvider/localStorageProvider';
import { seedData } from '@/lib/mock/seed';
import { 
  getActiveFreeDrinkStatus, 
  getNextActiveWindow, 
  calculateCapUsage,
  formatCurrency 
} from '@/lib/businessLogic';
import { Venue, FreeDrinkWindow } from '@/lib/types';

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const loadVenue = async () => {
      setIsLoading(true);
      try {
        if (!id) throw new Error("Venue ID is missing");
        const venueData = await dataProvider.getOne<Venue>('venues', id);
        setVenue(venueData);
        setIsPaused(venueData.is_paused);
      } catch (error) {
        console.error("Failed to load venue:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVenue();
    seedData(); // Ensure mock data is seeded
  }, [id]);

  const handlePauseToggle = async () => {
    if (!venue) return;

    const updatedVenue = { ...venue, is_paused: !isPaused };

    try {
      await dataProvider.update<Venue>('venues', venue.id, { is_paused: !isPaused });
      setVenue(updatedVenue);
      setIsPaused(!isPaused);
    } catch (error) {
      console.error("Failed to update venue pause status:", error);
    }
  };

  const handleVenueSave = async (updates: Partial<Venue>) => {
    if (!venue) return;

    try {
      const updatedVenue = { ...venue, ...updates };
      await dataProvider.update<Venue>('venues', venue.id, updates);
      setVenue(updatedVenue);
    } catch (error) {
      console.error("Failed to update venue:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="cgi-page flex bg-cgi-surface">
        <Sidebar />
        <main className="flex-1 lg:ml-0 min-h-screen bg-cgi-surface">
          <div className="cgi-container py-8">
            <div className="text-cgi-surface-foreground">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="cgi-page flex bg-cgi-surface">
        <Sidebar />
        <main className="flex-1 lg:ml-0 min-h-screen bg-cgi-surface">
          <div className="cgi-container py-8">
            <div className="text-cgi-surface-foreground">Venue not found</div>
          </div>
        </main>
      </div>
    );
  }

  // Fix: Pass complete venue object and current date to business logic functions
  const now = new Date();
  const activeFreeDrinkStatus = getActiveFreeDrinkStatus(venue, now);
  const nextWindow = getNextActiveWindow(venue, now);
  
  // Fix: Calculate cap usage with proper venue object and mock redemption count
  const mockRedemptionCount = 50; // This should come from actual data
  const capUsage = calculateCapUsage(venue, mockRedemptionCount);

  return (
    <div className="cgi-page flex bg-cgi-surface">
      <Sidebar />
      <main className="flex-1 lg:ml-0 min-h-screen bg-cgi-surface">
        <div className="cgi-container py-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">{venue.name}</h1>
              <p className="text-cgi-muted-foreground">
                {venue.address}
                {venue.description && <>&nbsp;•&nbsp;{venue.description}</>}
              </p>
              <div className="flex gap-2 mt-2">
                {venue.tags.map(tag => (
                  <Badge key={tag} className="cgi-badge bg-cgi-secondary text-cgi-secondary-foreground">{tag}</Badge>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-4">
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
            </div>
          </div>

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
            <KPICard 
              title="Aktív vendégek" 
              value="42" 
              icon={Building}
            />
            <KPICard 
              title="Következő akció" 
              value={nextWindow ? `${nextWindow.start} - ${nextWindow.end}` : 'Nincs ütemezett akció'}
              icon={Clock}
            />
          </div>

          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-cgi-muted">
              <TabsTrigger value="analytics" className="text-cgi-surface-foreground">Analitika</TabsTrigger>
              <TabsTrigger value="management" className="text-cgi-surface-foreground">Kezelés</TabsTrigger>
              <TabsTrigger value="settings" className="text-cgi-surface-foreground">Beállítások</TabsTrigger>
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
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="cgi-card bg-cgi-surface border-cgi-muted">
                <div className="cgi-card-header">
                  <h3 className="cgi-card-title text-cgi-surface-foreground">Beállítások</h3>
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
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
