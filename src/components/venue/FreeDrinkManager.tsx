import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CapProgressBar } from '@/components/CapProgressBar';
import ScheduleGridMobile from '@/components/ScheduleGridMobile';
import { supabase } from '@/integrations/supabase/client';
import { FreeDrinkWindow, RedemptionCap, CapUsage, Venue } from '@/lib/types';
import { Beer, Clock, Settings, Save, AlertCircle, CheckCircle2, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Json } from '@/integrations/supabase/types';

interface FreeDrinkManagerProps {
  venueId: string;
  onUpdate?: (updates: Partial<Venue>) => Promise<void>;
  compact?: boolean;
}

interface FreeDrinkStats {
  today_redemptions: number;
  cap_usage_pct: number;
  active_free_drinks: Array<{
    id: string;
    name: string;
    image_url?: string;
    category?: string;
    windows: FreeDrinkWindow[];
  }>;
  current_active_window: FreeDrinkWindow | null;
  next_window: FreeDrinkWindow | null;
  caps: {
    daily: number;
    perUserDaily: number;
    hourly: number;
    onExhaust: 'close' | 'show_alt_offer' | 'do_nothing';
  };
  is_active_now: boolean;
  is_paused: boolean;
}

const DAYS = [
  { value: 1, label: 'H' },
  { value: 2, label: 'K' },
  { value: 3, label: 'Sze' },
  { value: 4, label: 'Cs' },
  { value: 5, label: 'P' },
  { value: 6, label: 'Szo' },
  { value: 7, label: 'V' },
];

export function FreeDrinkManager({ venueId, onUpdate, compact = false }: FreeDrinkManagerProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [editingCaps, setEditingCaps] = useState(false);
  const [localCaps, setLocalCaps] = useState<RedemptionCap>({ daily: 0, perUserDaily: 1, onExhaust: 'close' });
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null);

  // Fetch free drink stats
  const { data: stats, isLoading, error, refetch } = useQuery<FreeDrinkStats>({
    queryKey: ['venue-free-drink-stats', venueId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-venue-free-drink-stats', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Initialize local caps when data loads
  useEffect(() => {
    if (stats?.caps && !editingCaps) {
      setLocalCaps({
        daily: stats.caps.daily,
        perUserDaily: stats.caps.perUserDaily,
        hourly: stats.caps.hourly,
        onExhaust: stats.caps.onExhaust,
      });
    }
    if (stats?.active_free_drinks?.length && !selectedDrinkId) {
      setSelectedDrinkId(stats.active_free_drinks[0].id);
    }
  }, [stats, editingCaps, selectedDrinkId]);

  // Update caps mutation
  const updateCapsMutation = useMutation({
    mutationFn: async (newCaps: RedemptionCap) => {
      const capsJson = {
        daily: newCaps.daily ?? 0,
        perUserDaily: newCaps.perUserDaily ?? 1,
        hourly: newCaps.hourly ?? 0,
        onExhaust: newCaps.onExhaust ?? 'close',
      } as Json;
      
      const { error } = await supabase
        .from('venues')
        .update({ caps: capsJson })
        .eq('id', venueId);
      if (error) throw error;
      if (onUpdate) {
        await onUpdate({ caps: newCaps });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-free-drink-stats', venueId] });
      toast.success('Kapacitás beállítások mentve!');
      setEditingCaps(false);
    },
    onError: (err) => {
      console.error('Failed to update caps:', err);
      toast.error('Hiba a mentés során');
    },
  });

  const handleSaveCaps = () => {
    updateCapsMutation.mutate(localCaps);
  };

  // Get the currently selected drink
  const selectedDrink = useMemo(() => {
    return stats?.active_free_drinks?.find(d => d.id === selectedDrinkId) || stats?.active_free_drinks?.[0];
  }, [stats?.active_free_drinks, selectedDrinkId]);

  // Calculate cap usage
  const capUsage: CapUsage = useMemo(() => ({
    used: stats?.today_redemptions || 0,
    limit: stats?.caps?.daily || 0,
    pct: stats?.cap_usage_pct || 0,
  }), [stats]);

  if (isLoading) {
    return (
      <Card className="cgi-card animate-pulse">
        <CardHeader className="cgi-card-header">
          <CardTitle className="cgi-card-title flex items-center gap-2">
            <Beer className="h-5 w-5" />
            Napi Ital Beállítás
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-cgi-muted rounded" />
          <div className="h-16 bg-cgi-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="cgi-card border-destructive">
        <CardContent className="py-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-cgi-muted-foreground">Hiba az adatok betöltésekor</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            Újrapróbálás
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasFreeDrinks = stats?.active_free_drinks && stats.active_free_drinks.length > 0;

  return (
    <Card className="cgi-card">
      <CardHeader className="cgi-card-header pb-4">
        <div className="flex items-center justify-between w-full">
          <CardTitle className="cgi-card-title flex items-center gap-2">
            <Beer className="h-5 w-5 text-cgi-primary" />
            Napi Ital Beállítás
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={stats?.is_active_now ? "default" : "secondary"}
                  className={stats?.is_active_now ? "bg-cgi-success text-cgi-success-foreground" : ""}
                >
                  {stats?.is_paused ? (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Szüneteltetve
                    </>
                  ) : stats?.is_active_now ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aktív
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Inaktív
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {stats?.is_paused 
                  ? 'A hely szüneteltetve van, nincs aktív ajánlat'
                  : stats?.is_active_now 
                    ? 'Most éppen fut egy aktív időablak' 
                    : 'Jelenleg nincs aktív időablak'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* No free drinks configured */}
        {!hasFreeDrinks && (
          <div className="text-center py-6 border border-dashed border-cgi-muted rounded-lg">
            <Beer className="h-10 w-10 mx-auto text-cgi-muted-foreground mb-2" />
            <p className="text-sm text-cgi-muted-foreground mb-3">
              Nincs beállított ingyenes ital
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={`/venues/${venueId}`}>
                <Settings className="h-4 w-4 mr-2" />
                Beállítás
              </a>
            </Button>
          </div>
        )}

        {/* Active drink display */}
        {hasFreeDrinks && (
          <>
            {/* Drink selector */}
            <div className="bg-cgi-muted/30 rounded-lg p-4 border border-cgi-muted">
              <div className="flex items-start gap-4">
                {selectedDrink?.image_url && (
                  <img
                    src={selectedDrink.image_url}
                    alt={selectedDrink.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-cgi-surface-foreground truncate">
                      {selectedDrink?.name || 'Válassz italt'}
                    </h4>
                    {stats.active_free_drinks.length > 1 && (
                      <Select
                        value={selectedDrinkId || ''}
                        onValueChange={setSelectedDrinkId}
                      >
                        <SelectTrigger className="w-auto h-8 text-xs px-2">
                          <SelectValue placeholder="Váltás" />
                        </SelectTrigger>
                        <SelectContent>
                          {stats.active_free_drinks.map((drink) => (
                            <SelectItem key={drink.id} value={drink.id}>
                              {drink.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {selectedDrink?.category && (
                    <Badge variant="outline" className="text-xs mb-2">
                      {selectedDrink.category}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-cgi-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {stats.current_active_window 
                        ? `Aktív: ${stats.current_active_window.start} - ${stats.current_active_window.end}`
                        : stats.next_window
                          ? `Következő: ${stats.next_window.start}`
                          : 'Nincs időablak'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule preview */}
              {selectedDrink?.windows && selectedDrink.windows.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cgi-muted">
                  <ScheduleGridMobile windows={selectedDrink.windows} />
                </div>
              )}
            </div>

            {/* Cap progress */}
            <div className="space-y-3">
              <CapProgressBar usage={capUsage} label="Napi kapacitás" />
            </div>

            {/* Cap settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-cgi-surface-foreground flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Limit beállítások
                </Label>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => setEditingCaps(true)}>
                      Szerkesztés
                    </Button>
                  </SheetTrigger>
                  <SheetContent side={isMobile ? "bottom" : "right"} className="bg-cgi-surface border-cgi-muted">
                    <SheetHeader>
                      <SheetTitle className="text-cgi-surface-foreground">Kapacitás Beállítások</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
                      {/* Daily limit */}
                      <div className="space-y-2">
                        <Label className="text-cgi-surface-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Napi limit
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={localCaps.daily || 0}
                          onChange={(e) => setLocalCaps({ ...localCaps, daily: parseInt(e.target.value) || 0 })}
                          className="cgi-input"
                          placeholder="0 = nincs limit"
                        />
                        <p className="text-xs text-cgi-muted-foreground">
                          Maximális beváltások száma naponta (0 = korlátlan)
                        </p>
                      </div>

                      {/* Per user limit */}
                      <div className="space-y-2">
                        <Label className="text-cgi-surface-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Per-user napi limit
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={localCaps.perUserDaily || 1}
                          onChange={(e) => setLocalCaps({ ...localCaps, perUserDaily: parseInt(e.target.value) || 1 })}
                          className="cgi-input"
                        />
                        <p className="text-xs text-cgi-muted-foreground">
                          Hányszor válthat be egy felhasználó naponta
                        </p>
                      </div>

                      {/* On exhaust behavior */}
                      <div className="space-y-2">
                        <Label className="text-cgi-surface-foreground">Ha elfogy a kvóta</Label>
                        <Select
                          value={localCaps.onExhaust || 'close'}
                          onValueChange={(value: 'close' | 'show_alt_offer' | 'do_nothing') => 
                            setLocalCaps({ ...localCaps, onExhaust: value })
                          }
                        >
                          <SelectTrigger className="cgi-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="close">Zárás - nem látható több ajánlat</SelectItem>
                            <SelectItem value="show_alt_offer">Alternatív ajánlat mutatása</SelectItem>
                            <SelectItem value="do_nothing">Nincs teendő - folytatódik</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        onClick={handleSaveCaps} 
                        className="w-full cgi-button-primary"
                        disabled={updateCapsMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updateCapsMutation.isPending ? 'Mentés...' : 'Mentés'}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-cgi-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-cgi-surface-foreground">
                    {stats.caps?.daily || '∞'}
                  </p>
                  <p className="text-xs text-cgi-muted-foreground">Napi limit</p>
                </div>
                <div className="bg-cgi-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-cgi-surface-foreground">
                    {stats.caps?.perUserDaily || 1}
                  </p>
                  <p className="text-xs text-cgi-muted-foreground">Per-user</p>
                </div>
                <div className="bg-cgi-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-cgi-surface-foreground">
                    {stats.caps?.onExhaust === 'close' ? 'Zár' : stats.caps?.onExhaust === 'show_alt_offer' ? 'Alt.' : '–'}
                  </p>
                  <p className="text-xs text-cgi-muted-foreground">Ha elfogy</p>
                </div>
              </div>
            </div>

            {/* Quick action */}
            {!compact && (
              <div className="pt-2 border-t border-cgi-muted">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href={`/venues/${venueId}`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Teljes szerkesztés
                  </a>
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
