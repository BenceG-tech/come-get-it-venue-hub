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
import { Venue, FreeDrinkWindow, RedemptionCap, VenueImage } from '@/lib/types';
import { Plus, Trash2, AlertCircle, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ImageUploadInput } from './ImageUploadInput';
import { useToast } from '@/hooks/use-toast';
import BusinessHoursEditor from './BusinessHoursEditor';
import VenueMapPreview from './VenueMapPreview';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';

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
    }
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
      }
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
    const coordinatesAreDefault = formData.coordinates?.lat === 0 && formData.coordinates?.lng === 0;
    
    if (formData.address && (addressChanged || coordinatesAreDefault)) {
      console.log('Geocoding needed:', { addressChanged, coordinatesAreDefault });
      const geocodeSuccess = await geocodeAddress(formData.address);
      if (!geocodeSuccess) {
        toast({
          title: 'Geocoding failed',
          description: 'Could not find coordinates for this address. You can continue with manual coordinates or try again.',
          variant: 'destructive' as any,
        });
        // Allow user to proceed with manual coordinates or fix address
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
    const coverImage = formData.images?.find(img => img.isCover);
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
        title: 'Siker', 
        description: 'Változások elmentve. Az italok most már láthatók!',
        duration: 5000
      });
      
      setOpen(false);
    } catch (error: any) {
      console.error('Save failed:', error);
      toast({ 
        title: 'Hiba', 
        description: String(error?.message || error), 
        variant: 'destructive' as any,
        duration: 7000 
      });
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="w-full overflow-x-auto no-scrollbar whitespace-nowrap justify-start gap-1 bg-cgi-muted h-auto min-h-[40px] flex-wrap sm:flex-nowrap p-1">
          <TabsTrigger value="basic" className="text-cgi-surface-foreground whitespace-nowrap flex-shrink-0 px-3 py-2 text-sm">Alapok</TabsTrigger>
          <TabsTrigger value="contact" className="text-cgi-surface-foreground whitespace-nowrap flex-shrink-0 px-3 py-2 text-sm">Kontakt</TabsTrigger>
          <TabsTrigger value="images" className="text-cgi-surface-foreground whitespace-nowrap flex-shrink-0 px-3 py-2 text-sm">Képek</TabsTrigger>
          <TabsTrigger value="drinks" className="text-cgi-surface-foreground whitespace-nowrap flex-shrink-0 px-3 py-2 text-sm">Italok</TabsTrigger>
          <TabsTrigger value="hours" className="text-cgi-surface-foreground whitespace-nowrap flex-shrink-0 px-3 py-2 text-sm">Nyitva</TabsTrigger>
          <TabsTrigger value="caps" className="text-cgi-surface-foreground whitespace-nowrap flex-shrink-0 px-3 py-2 text-sm">Limitek</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
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
                <Label htmlFor="address" className="text-cgi-surface-foreground">Cím *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, address: e.target.value }));
                    setGeocodeError(null);
                  }}
                  className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                  required
                />
                {geocodeError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{geocodeError}</AlertDescription>
                  </Alert>
                )}
                <div className="mt-3">
                  <VenueMapPreview
                    lat={formData.coordinates?.lat || 0}
                    lng={formData.coordinates?.lng || 0}
                    isLoading={geocoding}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-cgi-surface-foreground">Leírás</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Tag-ek</Label>
                <TagInput
                  tags={formData.tags || []}
                  onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_paused}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_paused: checked }))}
                />
                <Label className="text-cgi-surface-foreground">Szüneteltetve</Label>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-4">
                <div className="bg-cgi-muted/20 border border-cgi-muted rounded-lg p-4">
                  <h4 className="font-medium text-cgi-surface-foreground mb-2">GPS Koordináták (Opcionális)</h4>
                  <p className="text-sm text-cgi-muted-foreground mb-3">
                    A GPS koordináták segítenek a pontos helyszín meghatározásában térképes alkalmazásokban. 
                    Ha nem tölti ki, a rendszer a címből próbálja meghatározni a helyszínt.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-cgi-surface-foreground">Szélesség (Latitude)</Label>
                      <Input
                        value={formData.coordinates?.lat ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev, 
                          coordinates: { 
                            ...(prev.coordinates || { lat: 0, lng: 0 }), 
                            lat: Number(e.target.value) || 0 
                          }
                        }))}
                        className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                        inputMode="decimal"
                        placeholder="47.4979"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-cgi-surface-foreground">Hosszúság (Longitude)</Label>
                      <Input
                        value={formData.coordinates?.lng ?? ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev, 
                          coordinates: { 
                            ...(prev.coordinates || { lat: 0, lng: 0 }), 
                            lng: Number(e.target.value) || 0 
                          }
                        }))}
                        className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                        inputMode="decimal"
                        placeholder="19.0402"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="images" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-cgi-surface-foreground">Képek</Label>
                <div className="flex items-center gap-2">
                  {/* NEW: Upload and auto-add as new image */}
                  <ImageUploadInput
                    buttonLabel="Kép feltöltése"
                    onUploaded={(url) => addImageWithUrl(url)}
                    variant="outline"
                    size="sm"
                  />
                  <Button type="button" onClick={addImage} size="sm" className="cgi-button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Kép hozzáadása
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {formData.images?.map((img) => (
                  <Card key={img.id} className="p-4 cgi-card bg-cgi-surface border-cgi-muted">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-cgi-surface-foreground">Kép</h4>
                        <Button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>URL</Label>
                        {/* NEW: input + per-image uploader */}
                        <div className="flex gap-2">
                          <Input
                            value={img.url}
                            onChange={(e) => updateImage(img.id, { url: e.target.value })}
                            className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground flex-1"
                            placeholder="https://example.com/image.jpg"
                          />
                          <ImageUploadInput
                            buttonLabel="Feltöltés"
                            onUploaded={(url) => updateImage(img.id, { url })}
                            variant="outline"
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Címke</Label>
                        <Input
                          value={img.label || ''}
                          onChange={(e) => updateImage(img.id, { label: e.target.value })}
                          className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                          placeholder="pl. Beltér, Terasz"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={!!img.isCover}
                          onCheckedChange={() => setCoverImage(img.id)}
                        />
                        <Label className="text-cgi-surface-foreground">Főkép</Label>
                      </div>
                    </div>
                  </Card>
                ))}

                {!formData.images?.length && (
                  <div className="text-center py-8 text-cgi-muted-foreground">
                    Még nincsenek képek hozzáadva. Tölts fel egy képet a "Kép feltöltése" gombbal, vagy add meg az URL-t.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="drinks" className="space-y-4">
              <EnhancedDrinkSelector
                ref={drinkSelectorRef}
                drinks={formData.drinks || []}
                freeDrinkWindows={formData.freeDrinkWindows || []}
                onChange={(drinks) => {
                  setFormData(prev => ({ ...prev, drinks }));
                }}
                onFreeDrinkWindowsChange={(windows) => {
                  setFormData(prev => ({ ...prev, freeDrinkWindows: windows }));
                }}
              />
            </TabsContent>

            <TabsContent value="caps" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="daily-cap" className="text-cgi-surface-foreground">Napi limit</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-cgi-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Maximum ennyi ingyenes italt lehet beváltani naponta összesen ezen a helyszínen.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="daily-cap"
                    type="number"
                    value={formData.caps?.daily || ''}
                    onChange={(e) => updateCaps({ daily: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="cgi-input"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly-cap" className="text-cgi-surface-foreground">Óránkénti limit</Label>
                  <Input
                    id="hourly-cap"
                    type="number"
                    value={formData.caps?.hourly || ''}
                    onChange={(e) => updateCaps({ hourly: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="cgi-input"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly-cap" className="text-cgi-surface-foreground">Havi limit</Label>
                  <Input
                    id="monthly-cap"
                    type="number"
                    value={formData.caps?.monthly || ''}
                    onChange={(e) => updateCaps({ monthly: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="cgi-input"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="per-user-cap" className="text-cgi-surface-foreground">Felhasználónkénti napi limit</Label>
                  <Input
                    id="per-user-cap"
                    type="number"
                    value={formData.caps?.perUserDaily || ''}
                    onChange={(e) => updateCaps({ perUserDaily: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="cgi-input"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Elfogyás esetén</Label>
                <Select 
                  value={formData.caps?.onExhaust || 'close'} 
                  onValueChange={(value) => updateCaps({ onExhaust: value as any })}
                >
                  <SelectTrigger className="cgi-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="close">Ingyenes ital bezárása</SelectItem>
                    <SelectItem value="show_alt_offer">Alternatív ajánlat mutatása</SelectItem>
                    <SelectItem value="do_nothing">Semmi (folytatás)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.caps?.onExhaust === 'show_alt_offer' && (
                <div className="space-y-2">
                  <Label htmlFor="alt-offer" className="text-cgi-surface-foreground">Alternatív ajánlat szövege</Label>
                  <Textarea
                    id="alt-offer"
                    value={formData.caps?.altOfferText || ''}
                    onChange={(e) => updateCaps({ altOfferText: e.target.value })}
                    className="cgi-input"
                    placeholder="Pl: 20% kedvezmény minden italból!"
                    rows={2}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="hours" className="space-y-4">
              <BusinessHoursEditor
                initialHours={formData.business_hours}
                onSave={async (hours) => {
                  setFormData(prev => ({ ...prev, business_hours: hours }));
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-cgi-muted">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cgi-button-secondary w-full sm:w-auto" disabled={saving || geocoding}>
              Mégse
            </Button>
            <Button type="submit" className="cgi-button-primary w-full sm:w-auto" disabled={saving || geocoding}>
              {geocoding ? 'Geocoding...' : saving ? (venue ? 'Mentés...' : 'Létrehozás...') : (venue ? 'Mentés' : 'Létrehozás')}
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
        <SheetContent side="bottom" className="h-[95vh] overflow-y-auto bg-cgi-surface border-cgi-muted p-4">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-cgi-surface-foreground">
              {venue ? 'Helyszín szerkesztése' : 'Új helyszín'}
            </SheetTitle>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] bg-cgi-surface border-cgi-muted max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-cgi-surface-foreground">
            {venue ? 'Helyszín szerkesztése' : 'Új helyszín'}
          </DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}