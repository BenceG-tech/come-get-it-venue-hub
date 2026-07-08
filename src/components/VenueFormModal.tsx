import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { TagInput } from './TagInput';
import { EnhancedDrinkSelector, EnhancedDrinkSelectorRef } from './EnhancedDrinkSelector';
import { Venue, FreeDrinkWindow, RedemptionCap, VenueImage, VenueIntegrationType } from '@/lib/types';
import { Plus, Trash2, AlertCircle, HelpCircle, GripVertical, DollarSign, Star, Maximize2, Pencil, ImageIcon, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImageUploadInput } from './ImageUploadInput';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import BusinessHoursEditor from './BusinessHoursEditor';
import VenueMapPreview from './VenueMapPreview';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import { VenueIntegrationSettings } from './VenueIntegrationSettings';

interface VenueFormModalProps {
  venue?: Venue;
  onSave: (venue: Partial<Venue>) => void;
  trigger?: React.ReactNode;
}

export function VenueFormModal({ venue, onSave, trigger }: VenueFormModalProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [lastGeocodedAddress, setLastGeocodedAddress] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('basic');
  const closeAfterSaveRef = useRef<boolean>(false);
  const { toast } = useToast();
  const drinkSelectorRef = useRef<EnhancedDrinkSelectorRef>(null);
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<Partial<Venue>>({
    name: venue?.name || '',
    address: venue?.address || '',
    description: venue?.description || '',
    tags: venue?.tags || [],
    plan: venue?.plan || 'basic',
    is_paused: venue?.is_paused || false,
    drinks: venue?.drinks || [],
    freeDrinkWindows: venue?.freeDrinkWindows || [],
    caps: venue?.caps || {
      onExhaust: 'close'
    },
    notifications: venue?.notifications || {
      email: true,
      push: false,
      weekly_reports: true
    },
    // NEW fields
    phone_number: venue?.phone_number || '',
    website_url: venue?.website_url || '',
    images: venue?.images || [],
    coordinates: venue?.coordinates || { lat: 0, lng: 0 },
    business_hours: venue?.business_hours || {
      byDay: {
        1: { open: '09:00', close: '22:00' },
        2: { open: '09:00', close: '22:00' },
        3: { open: '09:00', close: '22:00' },
        4: { open: '09:00', close: '22:00' },
        5: { open: '09:00', close: '23:00' },
        6: { open: '10:00', close: '23:00' },
        7: { open: '10:00', close: '21:00' },
      },
      specialDates: []
    },
    // Integration fields
    integration_type: venue?.integration_type || 'none',
    goorderz_external_id: venue?.goorderz_external_id || '',
    saltedge_connection_id: venue?.saltedge_connection_id || '',
    price_tier: venue?.price_tier ?? null,
    category: venue?.category || '',
    rating: venue?.rating ?? null,
    participates_in_points: venue?.participates_in_points ?? true,
    points_per_visit: venue?.points_per_visit ?? 10,
    redemption_radius_m: venue?.redemption_radius_m ?? null,
  });


  // Rehydrate form with latest venue data each time the modal opens
  useEffect(() => {
    if (!open) return;
    setFormData({
      name: venue?.name || '',
      address: venue?.address || '',
      description: venue?.description || '',
      tags: venue?.tags || [],
      plan: venue?.plan || 'basic',
      is_paused: venue?.is_paused || false,
      drinks: venue?.drinks || [],
      freeDrinkWindows: venue?.freeDrinkWindows || [],
      caps: venue?.caps || { onExhaust: 'close' },
      notifications: venue?.notifications || { email: true, push: false, weekly_reports: true },
      phone_number: venue?.phone_number || '',
      website_url: venue?.website_url || '',
      images: venue?.images || [],
      coordinates: venue?.coordinates || { lat: 0, lng: 0 },
      business_hours: venue?.business_hours || {
        byDay: {
          1: { open: '09:00', close: '22:00' },
          2: { open: '09:00', close: '22:00' },
          3: { open: '09:00', close: '22:00' },
          4: { open: '09:00', close: '22:00' },
          5: { open: '09:00', close: '23:00' },
          6: { open: '10:00', close: '23:00' },
          7: { open: '10:00', close: '21:00' },
        },
        specialDates: []
      },
      // Integration fields
      integration_type: venue?.integration_type || 'none',
      goorderz_external_id: venue?.goorderz_external_id || '',
      saltedge_connection_id: venue?.saltedge_connection_id || '',
      price_tier: venue?.price_tier ?? null,
      category: venue?.category || '',
      rating: venue?.rating ?? null,
      participates_in_points: venue?.participates_in_points ?? true,
      points_per_visit: venue?.points_per_visit ?? 10,
    });
  }, [open, venue?.id]);

  const updateCaps = (updates: Partial<RedemptionCap>) => {
    setFormData(prev => ({
      ...prev,
      caps: { ...prev.caps, ...updates }
    }));
  };

  const addImage = () => {
    const newImage: VenueImage = {
      id: crypto.randomUUID(),
      url: '',
      label: ''
    };
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), newImage]
    }));
  };

  // NEW: add a helper to append a freshly uploaded image
  const addImageWithUrl = (url: string) => {
    const newImage: VenueImage = {
      id: crypto.randomUUID(),
      url,
      label: ''
    };
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), newImage]
    }));
  };

  const removeImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter(img => img.id !== id) || []
    }));
  };

  const updateImage = (id: string, updates: Partial<VenueImage>) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.map(img => 
        img.id === id ? { ...img, ...updates } : img
      ) || []
    }));
  };

  const setCoverImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.map(img => ({
        ...img,
        isCover: img.id === id
      })) || []
    }));
  };

  // Drag & drop image reordering
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleImagesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFormData(prev => {
      const imgs = prev.images || [];
      const oldIndex = imgs.findIndex(i => i.id === active.id);
      const newIndex = imgs.findIndex(i => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, images: arrayMove(imgs, oldIndex, newIndex) };
    });
  };

  const moveImage = (id: string, direction: 'up' | 'down') => {
    setFormData(prev => {
      const imgs = prev.images || [];
      const index = imgs.findIndex(img => img.id === id);
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= imgs.length) return prev;
      return { ...prev, images: arrayMove(imgs, index, nextIndex) };
    });
  };

  // Geocoding function
  const geocodeAddress = async (address: string) => {
    setGeocoding(true);
    setGeocodeError(null);
    try {
      console.log('Geocoding address:', address);
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });

      if (error) {
        console.error('Geocoding error:', error);
        throw new Error(error.message || 'Geocoding failed');
      }

      if (!data || !data.lat || !data.lng) {
        throw new Error('Invalid geocoding response');
      }

      console.log('Geocoding successful:', data);
      setFormData(prev => ({
        ...prev,
        coordinates: { lat: data.lat, lng: data.lng },
        formatted_address: data.formatted_address,
        google_maps_url: data.google_maps_url,
      }));
      setLastGeocodedAddress(address);
      return true;
    } catch (error: any) {
      console.error('Geocoding failed:', error);
      setGeocodeError(error.message || 'Failed to geocode address');
      return false;
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Flush any staged drinks synchronously and get the updated data
    let finalDrinks = formData.drinks || [];
    let finalWindows = formData.freeDrinkWindows || [];
    
    if (drinkSelectorRef.current) {
      console.log('[VenueFormModal] Flushing staged drinks before save');
      const flushResult = await drinkSelectorRef.current.flushStaged();
      if (!flushResult.success) {
        console.error('[VenueFormModal] Failed to flush staged drinks:', flushResult.error);
        return; // Don't proceed with save
      }
      
      // Use the returned drinks and windows to ensure we have the latest data
      if (flushResult.drinks) {
        finalDrinks = flushResult.drinks;
        console.log('[VenueFormModal] Updated drinks from flush:', finalDrinks.length);
      }
      if (flushResult.windows) {
        finalWindows = flushResult.windows;
        console.log('[VenueFormModal] Updated windows from flush:', finalWindows.length);
      }
    }

    // Check if geocoding is needed
    const addressChanged = formData.address !== lastGeocodedAddress;
    const lat = formData.coordinates?.lat;
    const lng = formData.coordinates?.lng;
    const coordinatesAreDefault = !lat || !lng || (lat === 0 && lng === 0);
    // Budapest bounding box sanity check — ha a cím Budapest de a koordináta kívül esik, újra geokódolunk
    const addressLooksBudapest = (formData.address || '').toLowerCase().includes('budapest');
    const outsideBudapestBBox = addressLooksBudapest && lat != null && lng != null &&
      (lat < 47.3 || lat > 47.7 || lng < 18.8 || lng > 19.4);

    if (formData.address && (addressChanged || coordinatesAreDefault || outsideBudapestBBox)) {
      console.log('Geocoding needed:', { addressChanged, coordinatesAreDefault, outsideBudapestBBox });
      const geocodeSuccess = await geocodeAddress(formData.address);
      if (!geocodeSuccess) {
        toast({
          title: 'Geokódolás sikertelen',
          description: 'A cím alapján nem sikerült koordinátákat találni. Ellenőrizd a címet vagy add meg kézzel a Speciális szekcióban.',
          variant: 'destructive' as any,
        });
        return;
      }
    }

    // Validation: Check that every free drink has at least one time window
    const freeDrinks = finalDrinks.filter(d => d.is_free_drink) || [];
    for (const drink of freeDrinks) {
      const drinkWindows = finalWindows.filter(w => w.drink_id === drink.id) || [];
      if (drinkWindows.length === 0) {
        toast({ title: 'Hiba', description: `Az ingyenes ital ("${drink.drinkName}") nem rendelkezik időablakokkal.`, variant: 'destructive' as any });
        return;
      }
    }

    // Extract cover image URL and set it to both image_url and hero_image_url
    const coverImage = formData.images?.find(img => img.isCover) || formData.images?.find(img => img.url?.trim());
    const finalFormData: any = {
      ...formData,
      drinks: finalDrinks,
      freeDrinkWindows: finalWindows,
      image_url: coverImage?.url || null,
      hero_image_url: coverImage?.url || null,
    };

    // ALWAYS include drinks and windows in payload - never prune them implicitly
    console.info('[VenueFormModal] Submit payload preview', {
      drinksLen: finalDrinks.length,
      windowsLen: finalWindows.length,
      drinkNames: finalDrinks.map(d => d.drinkName),
      freeDrinkNames: freeDrinks.map(d => d.drinkName),
      hasDrinksInPayload: !!finalFormData.drinks,
      hasWindowsInPayload: !!finalFormData.freeDrinkWindows,
    });
    try {
      setSaving(true);
      await Promise.resolve(onSave(finalFormData));
      toast({
        title: 'Elmentve',
        description: closeAfterSaveRef.current
          ? 'Változások elmentve.'
          : 'Változások elmentve. Folytathatod a szerkesztést.',
        duration: 3500,
      });

      if (closeAfterSaveRef.current) {
        setOpen(false);
      }
    } catch (error: any) {
      console.error('Save failed:', error);
      toast({
        title: 'Hiba',
        description: String(error?.message || error),
        variant: 'destructive' as any,
        duration: 7000,
      });
    } finally {
      setSaving(false);
      closeAfterSaveRef.current = false;
    }
  };

  const imageCount = formData.images?.length || 0;

  const tabItems = [
    { value: 'basic', label: 'Általános' },
    { value: 'location', label: 'Helyszín & Nyitva' },
    { value: 'drinks', label: 'Italok & Limitek' },
    { value: 'images', label: `Képek${imageCount > 0 ? ` (${imageCount})` : ''}` },
    { value: 'integration', label: 'Integráció' },
  ];

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col h-full" data-venue-form>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="sticky top-0 z-10 bg-cgi-surface pb-1.5 -mx-1 px-1">
          {isMobile ? (
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="cgi-input h-9 bg-cgi-surface border-cgi-muted text-cgi-surface-foreground font-medium text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cgi-surface border-cgi-muted">
                {tabItems.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="w-full overflow-x-auto no-scrollbar whitespace-nowrap justify-start gap-1 bg-cgi-muted h-auto min-h-[40px] p-1">
              {tabItems.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="text-cgi-surface-foreground whitespace-nowrap flex-shrink-0 px-3 py-2 text-sm">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pt-3">

        {/* ÁLTALÁNOS */}
        <TabsContent value="basic" className="space-y-4 mt-0">
          <p className="text-xs text-cgi-muted-foreground">Alap adatok, elérhetőség és megjelenés a vendégoldalon.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name" className="text-cgi-surface-foreground">Név *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan" className="text-cgi-surface-foreground">Csomag *</Label>
              <Select value={formData.plan} onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value as any }))}>
                <SelectTrigger className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cgi-surface border-cgi-muted">
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-cgi-surface-foreground">Leírás</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
              rows={2}
              placeholder="Rövid leírás a helyszínről"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Telefonszám</Label>
              <Input
                value={formData.phone_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                placeholder="+36 1 234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Weboldal</Label>
              <Input
                value={formData.website_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-cgi-surface-foreground">Árkategória</Label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { v: null, label: 'Nincs' },
                { v: 1, label: '$' },
                { v: 2, label: '$$' },
                { v: 3, label: '$$$' },
                { v: 4, label: '$$$$' },
              ].map(opt => {
                const active = (formData.price_tier ?? null) === opt.v;
                return (
                  <button
                    type="button"
                    key={String(opt.v)}
                    onClick={() => setFormData(prev => ({ ...prev, price_tier: opt.v as any }))}
                    className={cn(
                      'px-3 py-1.5 rounded-md border text-sm font-medium transition-colors inline-flex items-center gap-1',
                      active
                        ? 'border-cgi-primary bg-cgi-primary/10 text-cgi-primary'
                        : 'border-cgi-muted bg-cgi-surface text-cgi-muted-foreground hover:text-cgi-surface-foreground hover:border-cgi-primary/40',
                    )}
                  >
                    {opt.v === null ? (
                      <span>Nincs</span>
                    ) : (
                      Array.from({ length: opt.v }).map((_, i) => (
                        <DollarSign key={i} className="h-3.5 w-3.5" strokeWidth={2.5} />
                      ))
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Kategória</Label>
              <Select
                value={formData.category || ''}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground">
                  <SelectValue placeholder="Válassz kategóriát" />
                </SelectTrigger>
                <SelectContent>
                  {['Bisztró', 'Étterem', 'Koktélbár', 'Klub', 'Romkocsma', 'Kávézó', 'Bár', 'Pub', 'Egyéb'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Értékelés (0–5)</Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={formData.rating ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value === '' ? null : Number(e.target.value) }))}
                className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                placeholder="pl. 4.7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-cgi-surface-foreground">Tag-ek</Label>
            <TagInput
              tags={formData.tags || []}
              onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center p-3 rounded-md border border-cgi-muted bg-cgi-muted/10">
            <div>
              <Label className="text-cgi-surface-foreground">Pontgyűjtés aktív</Label>
              <p className="text-xs text-cgi-muted-foreground mt-0.5">A vendégek pontokat kapnak a látogatásért.</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                step={1}
                value={formData.points_per_visit ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, points_per_visit: e.target.value === '' ? null : Number(e.target.value) }))}
                className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground w-24"
                placeholder="10"
                disabled={!formData.participates_in_points}
              />
              <Switch
                checked={!!formData.participates_in_points}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, participates_in_points: checked }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border border-cgi-muted bg-cgi-muted/10">
            <div className="pr-3">
              <Label className="text-cgi-surface-foreground">Megjelenik a mobilappban</Label>
              <p className="text-xs text-cgi-muted-foreground mt-0.5">
                Ha kikapcsolod, a helyszín eltűnik az applikációból, de az adatok és beállítások megmaradnak. Bármikor visszakapcsolható.
              </p>
            </div>
            <Switch
              checked={!formData.is_paused}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_paused: !checked }))}
            />
          </div>
        </TabsContent>

        {/* HELYSZÍN & NYITVATARTÁS */}
        <TabsContent value="location" className="space-y-4 mt-0">
          <p className="text-xs text-cgi-muted-foreground">Cím, térkép és nyitvatartási idők.</p>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-cgi-surface-foreground">Cím *</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, address: e.target.value }));
                  setGeocodeError(null);
                }}
                className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground flex-1"
                required
                placeholder="1051 Budapest, Példa utca 1."
              />
              <Button
                type="button"
                variant="outline"
                className="cgi-button-secondary whitespace-nowrap"
                disabled={geocoding || !formData.address}
                onClick={async () => {
                  const ok = await geocodeAddress(formData.address || '');
                  if (ok) {
                    toast({
                      title: 'Koordináták frissítve',
                      description: 'A térkép a cím alapján az új helyre került.',
                    });
                  }
                }}
              >
                {geocoding ? 'Keresés...' : 'Frissítés címből'}
              </Button>
            </div>
            <p className="text-xs text-cgi-muted-foreground">
              A koordinátákat automatikusan a cím alapján határozzuk meg — nem kell kézzel beírnod.
            </p>
            {geocodeError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{geocodeError}</AlertDescription>
              </Alert>
            )}
            <div className="mt-2">
              <VenueMapPreview
                lat={formData.coordinates?.lat || 0}
                lng={formData.coordinates?.lng || 0}
                isLoading={geocoding}
              />
            </div>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-cgi-muted-foreground hover:text-cgi-surface-foreground transition-colors">
              <ChevronDown className="h-4 w-4" />
              Speciális: GPS koordináták kézi megadása
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-md border border-cgi-muted bg-cgi-muted/10">
                <div className="space-y-2">
                  <Label className="text-cgi-surface-foreground text-xs">Szélesség (lat)</Label>
                  <Input
                    value={formData.coordinates?.lat ?? ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      coordinates: { ...(prev.coordinates || { lat: 0, lng: 0 }), lat: Number(e.target.value) || 0 }
                    }))}
                    className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                    inputMode="decimal"
                    placeholder="47.4979"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cgi-surface-foreground text-xs">Hosszúság (lng)</Label>
                  <Input
                    value={formData.coordinates?.lng ?? ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      coordinates: { ...(prev.coordinates || { lat: 0, lng: 0 }), lng: Number(e.target.value) || 0 }
                    }))}
                    className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                    inputMode="decimal"
                    placeholder="19.0402"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="pt-2">
            <h4 className="text-sm font-medium text-cgi-surface-foreground mb-3">Nyitvatartás</h4>
            <BusinessHoursEditor
              initialHours={formData.business_hours}
              onSave={async (hours) => {
                setFormData(prev => ({ ...prev, business_hours: hours }));
              }}
            />
          </div>
        </TabsContent>

        {/* ITALOK & LIMITEK */}
        <TabsContent value="drinks" className="space-y-3 mt-0">
          <div>
            <EnhancedDrinkSelector
              ref={drinkSelectorRef}
              drinks={formData.drinks || []}
              freeDrinkWindows={formData.freeDrinkWindows || []}
              onChange={(drinks) => setFormData(prev => ({ ...prev, drinks }))}
              onFreeDrinkWindowsChange={(windows) => setFormData(prev => ({ ...prev, freeDrinkWindows: windows }))}
            />
          </div>

          <div className="pt-3 border-t border-cgi-muted">
            <h4 className="text-sm font-medium text-cgi-surface-foreground mb-2">Beváltási limitek</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="daily-cap" className="text-cgi-surface-foreground text-xs">Napi</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-cgi-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Max ingyenes ital naponta összesen.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input id="daily-cap" type="number" value={formData.caps?.daily || ''} onChange={(e) => updateCaps({ daily: e.target.value ? parseInt(e.target.value) : undefined })} className="cgi-input" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hourly-cap" className="text-cgi-surface-foreground text-xs">Óránkénti</Label>
                <Input id="hourly-cap" type="number" value={formData.caps?.hourly || ''} onChange={(e) => updateCaps({ hourly: e.target.value ? parseInt(e.target.value) : undefined })} className="cgi-input" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly-cap" className="text-cgi-surface-foreground text-xs">Havi</Label>
                <Input id="monthly-cap" type="number" value={formData.caps?.monthly || ''} onChange={(e) => updateCaps({ monthly: e.target.value ? parseInt(e.target.value) : undefined })} className="cgi-input" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="per-user-cap" className="text-cgi-surface-foreground text-xs">User/nap</Label>
                <Input id="per-user-cap" type="number" value={formData.caps?.perUserDaily || ''} onChange={(e) => updateCaps({ perUserDaily: e.target.value ? parseInt(e.target.value) : undefined })} className="cgi-input" min="0" />
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <Label className="text-cgi-surface-foreground text-xs">Elfogyás esetén</Label>
              <Select value={formData.caps?.onExhaust || 'close'} onValueChange={(value) => updateCaps({ onExhaust: value as any })}>
                <SelectTrigger className="cgi-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="close">Ingyenes ital bezárása</SelectItem>
                  <SelectItem value="show_alt_offer">Alternatív ajánlat mutatása</SelectItem>
                  <SelectItem value="do_nothing">Semmi (folytatás)</SelectItem>
                </SelectContent>
              </Select>
              {formData.caps?.onExhaust === 'show_alt_offer' && (
                <Textarea
                  value={formData.caps?.altOfferText || ''}
                  onChange={(e) => updateCaps({ altOfferText: e.target.value })}
                  className="cgi-input mt-2"
                  placeholder="Pl: 20% kedvezmény minden italból!"
                  rows={2}
                />
              )}
            </div>
          </div>
        </TabsContent>

        {/* KÉPEK – mobilbarát galéria */}
        <TabsContent value="images" className="space-y-3 mt-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label className="text-cgi-surface-foreground">Képek</Label>
              <p className="text-xs text-cgi-muted-foreground mt-0.5">{imageCount} kép · az első vagy kijelölt kép lesz a főkép</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ImageUploadInput
                buttonLabel="Feltöltés"
                onUploaded={(url) => addImageWithUrl(url)}
                variant="outline"
                size="sm"
                className="[&_button]:h-9 [&_button]:px-2 [&_button]:text-xs"
                multiple
              />
              <Button type="button" onClick={addImage} size="sm" className="cgi-button-primary h-9 px-2 text-xs">
                <Plus className="h-4 w-4" />
                URL
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleImagesDragEnd}
          >
            <SortableContext
              items={(formData.images || []).map(i => i.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {formData.images?.map((img, idx) => (
                  <ThumbnailImageCard
                    key={img.id}
                    img={img}
                    index={idx}
                    isImplicitCover={idx === 0 && !formData.images?.some(i => i.isCover)}
                    onRemove={() => removeImage(img.id)}
                    onUpdate={(updates) => updateImage(img.id, updates)}
                    onSetCover={() => setCoverImage(img.id)}
                    onMoveUp={() => moveImage(img.id, 'up')}
                    onMoveDown={() => moveImage(img.id, 'down')}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < (formData.images?.length || 0) - 1}
                  />
                ))}
              </div>

              {!formData.images?.length && (
                <div className="text-center py-10 text-cgi-muted-foreground border border-dashed border-cgi-muted rounded-md bg-cgi-muted/10">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Még nincsenek képek hozzáadva.</p>
                  <p className="text-xs mt-1">A Feltöltés gombbal több képet is választhatsz.</p>
                </div>
              )}
            </SortableContext>
          </DndContext>
        </TabsContent>

        {/* INTEGRÁCIÓ */}
        <TabsContent value="integration" className="space-y-4 mt-0">
          <p className="text-xs text-cgi-muted-foreground">Külső rendszerek (Goorderz, Salt Edge) összekötése.</p>
          <VenueIntegrationSettings
            integrationType={formData.integration_type || 'none'}
            goorderzExternalId={formData.goorderz_external_id}
            saltedgeConnectionId={formData.saltedge_connection_id}
            onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          />
        </TabsContent>

        </div>
      </Tabs>

      <div
        className={cn(
          "flex-shrink-0 bg-cgi-surface border-t border-cgi-muted",
          isMobile
            ? "flex flex-row gap-2 pt-2 mt-1"
            : "flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 mt-2"
        )}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          className={cn("cgi-button-secondary", isMobile ? "flex-1 h-10 text-sm" : "w-full sm:w-auto min-h-[48px]")}
          disabled={saving || geocoding}
        >
          Mégse
        </Button>
        {!isMobile && (
          <Button
            type="submit"
            variant="outline"
            className="cgi-button-secondary w-full sm:w-auto min-h-[48px]"
            disabled={saving || geocoding}
            onClick={() => { closeAfterSaveRef.current = false; }}
          >
            {geocoding ? 'Geocoding...' : saving && !closeAfterSaveRef.current ? 'Mentés...' : (venue ? 'Mentés' : 'Létrehozás')}
          </Button>
        )}
        <Button
          type="submit"
          className={cn("cgi-button-primary", isMobile ? "flex-1 h-10 text-sm" : "w-full sm:w-auto min-h-[48px]")}
          disabled={saving || geocoding}
          onClick={() => { closeAfterSaveRef.current = true; }}
        >
          {saving && closeAfterSaveRef.current ? 'Mentés...' : (isMobile ? '✓ Mentés + bezárás' : 'Mentés és bezárás')}
        </Button>
      </div>
    </form>
  );

  // Use Sheet on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[95vh] bg-cgi-surface border-cgi-muted px-3 pt-3 pb-2 flex flex-col">
          <SheetHeader className="mb-1 flex-shrink-0">
            <div className="flex items-center justify-between gap-2 pr-7">
              <SheetTitle className="text-cgi-surface-foreground text-sm truncate">
                {venue ? 'Helyszín szerkesztése' : 'Új helyszín'}
              </SheetTitle>
              <Button
                type="button"
                size="sm"
                className="cgi-button-primary h-8 px-3 text-xs flex-shrink-0"
                disabled={saving || geocoding}
                onClick={() => {
                  closeAfterSaveRef.current = false;
                  const form = document.querySelector<HTMLFormElement>('form[data-venue-form]');
                  form?.requestSubmit();
                }}
              >
                {saving ? 'Mentés...' : 'Mentés'}
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col">
            {formContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] bg-cgi-surface border-cgi-muted h-[90vh] flex flex-col p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-cgi-surface-foreground">
            {venue ? 'Helyszín szerkesztése' : 'Új helyszín'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ThumbnailImageCardProps {
  img: VenueImage;
  index: number;
  isImplicitCover: boolean;
  onRemove: () => void;
  onUpdate: (updates: Partial<VenueImage>) => void;
  onSetCover: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function ThumbnailImageCard({ img, index, isImplicitCover, onRemove, onUpdate, onSetCover, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: ThumbnailImageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  const isCover = !!img.isCover;
  const hasUrl = !!img.url?.trim();

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group relative aspect-square rounded-lg overflow-hidden border bg-cgi-muted/20',
          isCover ? 'border-cgi-primary ring-2 ring-cgi-primary/40' : 'border-cgi-muted',
          isDragging && 'opacity-80 shadow-lg ring-2 ring-cgi-primary',
        )}
      >
        {/* Image or placeholder */}
        {hasUrl ? (
          <img
            src={img.url}
            alt={img.label || `Kép ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-cgi-muted-foreground p-2 text-center">
            <ImageIcon className="h-8 w-8 mb-1 opacity-60" />
            <span className="text-[10px] uppercase tracking-wide">Nincs feltöltve</span>
          </div>
        )}

        {/* Cover badge */}
        {(isCover || isImplicitCover) && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-cgi-primary text-cgi-primary-foreground text-[10px] font-medium">
            <Star className="h-3 w-3 fill-current" />
            {isCover ? 'Főkép' : 'Auto főkép'}
          </div>
        )}

        {/* Index badge */}
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-cgi-background/80 text-cgi-surface-foreground text-[10px] font-medium">
          #{index + 1}
        </div>

        {/* Drag handle (always visible top middle) */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-1.5 left-1/2 -translate-x-1/2 touch-none cursor-grab active:cursor-grabbing rounded p-1 bg-cgi-background/80 text-cgi-surface-foreground opacity-0 sm:group-hover:opacity-100 transition-opacity"
          aria-label="Áthúzás"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Mobile-visible actions, hover on desktop */}
        <div className="absolute inset-x-0 bottom-0 p-1.5 flex items-center justify-between gap-1 bg-cgi-background/85 backdrop-blur-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            {hasUrl && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="p-1.5 rounded bg-cgi-muted/70 hover:bg-cgi-muted text-cgi-surface-foreground"
                aria-label="Nagyítás"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="p-1.5 rounded bg-cgi-muted/70 hover:bg-cgi-muted text-cgi-surface-foreground disabled:opacity-35"
              aria-label="Előrébb"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="p-1.5 rounded bg-cgi-muted/70 hover:bg-cgi-muted text-cgi-surface-foreground disabled:opacity-35"
              aria-label="Hátrébb"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onSetCover}
              className={cn(
                'p-1.5 rounded text-cgi-surface-foreground',
                isCover ? 'bg-cgi-primary text-cgi-primary-foreground' : 'bg-cgi-muted/70 hover:bg-cgi-muted'
              )}
              aria-label="Főkép kijelölése"
              title="Főkép kijelölése"
            >
              <Star className={cn('h-3.5 w-3.5', isCover && 'fill-current')} />
            </button>
            <Popover open={editOpen} onOpenChange={setEditOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded bg-cgi-muted/70 hover:bg-cgi-muted text-cgi-surface-foreground"
                  aria-label="Szerkesztés"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-cgi-surface border-cgi-muted" side="top">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-cgi-surface-foreground">URL</Label>
                    <div className="flex gap-1">
                      <Input
                        value={img.url}
                        onChange={(e) => onUpdate({ url: e.target.value })}
                        className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground text-xs flex-1"
                        placeholder="https://..."
                      />
                      <ImageUploadInput
                        buttonLabel="↑"
                        onUploaded={(url) => onUpdate({ url })}
                        variant="outline"
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-cgi-surface-foreground">Címke</Label>
                    <Input
                      value={img.label || ''}
                      onChange={(e) => onUpdate({ label: e.target.value })}
                      className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground text-xs"
                      placeholder="pl. Beltér, Terasz"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded bg-cgi-error/20 hover:bg-cgi-error/30 text-cgi-error"
            aria-label="Törlés"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Label strip at bottom (always shown if exists) */}
        {img.label && (
          <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-cgi-background/80 text-cgi-surface-foreground text-[10px] truncate opacity-0 sm:opacity-100 sm:group-hover:opacity-0 transition-opacity">
            {img.label}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl bg-cgi-surface border-cgi-muted p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>{img.label || `Kép ${index + 1}`}</DialogTitle>
          </DialogHeader>
          <img
            src={img.url}
            alt={img.label || `Kép ${index + 1}`}
            className="w-full max-h-[80vh] object-contain rounded"
          />
          {img.label && (
            <p className="text-center text-sm text-cgi-muted-foreground py-2">{img.label}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}