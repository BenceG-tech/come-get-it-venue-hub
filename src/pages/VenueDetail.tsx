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

interface CapData {
  label: string;
  used: number;
  limit: number;
}

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [activeFreeDrinkStatus, setActiveFreeDrinkStatus] = useState({ isActive: false });
  const [nextWindow, setNextWindow] = useState<FreeDrinkWindow | null>(null);
  const [capData, setCapData] = useState<CapData[]>([]);

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

  useEffect(() => {
    if (venue) {
      setActiveFreeDrinkStatus(getActiveFreeDrinkStatus(venue.freeDrinkWindows));
      setNextWindow(getNextActiveWindow(venue.freeDrinkWindows));

      // Prepare cap usage data
      const dailyCap = calculateCapUsage(venue.caps.daily, 50);
      const hourlyCap = calculateCapUsage(venue.caps.hourly, 10);

      setCapData([
        { label: 'Napi limit', used: dailyCap.used, limit: dailyCap.limit },
        { label: 'Óránkénti limit', used: hourlyCap.used, limit: hourlyCap.limit },
      ]);
    }
  }, [venue]);

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
    return <div>Loading...</div>;
  }

  if (!venue) {
    return <div>Venue not found</div>;
  }

  return (
    <div className="cgi-page flex">
      <Sidebar />
      <main className="flex-1 lg:ml-0 min-h-screen">
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
                  <Badge key={tag} className="cgi-badge">{tag}</Badge>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <VenueFormModal venue={venue} onSave={handleVenueSave}>
                <Button variant="outline" className="cgi-button-secondary">
                  <Edit className="h-4 w-4 mr-2" />
                  Szerkesztés
                </Button>
              </VenueFormModal>
              
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
              helpText="A mai napon eddig realizált forgalom"
            />
            <KPICard 
              title="Mai ingyenes italok" 
              value="89" 
              icon={Users} 
              helpText="A mai napon eddig felhasznált ingyenes italok száma"
            />
            <KPICard 
              title="Aktív vendégek" 
              value="42" 
              icon={Building} 
              helpText="Jelenleg a helyszínen tartózkodó aktív vendégek száma"
            />
            <KPICard 
              title="Következő akció" 
              value={nextWindow ? `${nextWindow.start} - ${nextWindow.end}` : 'Nincs ütemezett akció'}
              icon={Clock} 
              helpText="A következő ingyenes ital akció időpontja"
            />
          </div>

          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="analytics">Analitika</TabsTrigger>
              <TabsTrigger value="management">Kezelés</TabsTrigger>
              <TabsTrigger value="settings">Beállítások</TabsTrigger>
            </TabsList>
            
            <TabsContent value="analytics" className="space-y-4">
              <ChartCard title="Forgalom alakulása" />
            </TabsContent>

            <TabsContent value="management" className="space-y-4">
              <Card className="cgi-card">
                <div className="cgi-card-header">
                  <h3 className="cgi-card-title">Napi limitek</h3>
                </div>
                <div className="space-y-4">
                  {capData.map((cap, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{cap.label}</Label>
                        <span className="text-sm text-cgi-muted-foreground">
                          {cap.used} / {cap.limit}
                        </span>
                      </div>
                      <CapProgressBar value={(cap.used / cap.limit) * 100} />
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="cgi-card">
                <div className="cgi-card-header">
                  <h3 className="cgi-card-title">Beállítások</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue-name">Helyszín neve</Label>
                    <input
                      type="text"
                      id="venue-name"
                      className="cgi-input"
                      value={venue.name}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue-address">Cím</Label>
                    <input
                      type="text"
                      id="venue-address"
                      className="cgi-input"
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
