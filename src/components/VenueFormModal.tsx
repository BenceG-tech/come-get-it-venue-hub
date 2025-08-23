import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TagInput } from './TagInput';
import { DrinkSelector } from './DrinkSelector';
import { TimeRangeInput } from './TimeRangeInput';
import { Badge } from '@/components/ui/badge';
import { Venue, FreeDrinkWindow, RedemptionCap, VenueImage } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { ImageUploadInput } from './ImageUploadInput';

interface VenueFormModalProps {
  venue?: Venue;
  onSave: (venue: Partial<Venue>) => void;
  trigger?: React.ReactNode;
}

const DAYS = [
  { value: 1, label: 'Hétfő' },
  { value: 2, label: 'Kedd' },
  { value: 3, label: 'Szerda' },
  { value: 4, label: 'Csütörtök' },
  { value: 5, label: 'Péntek' },
  { value: 6, label: 'Szombat' },
  { value: 7, label: 'Vasárnap' },
];

export function VenueFormModal({ venue, onSave, trigger }: VenueFormModalProps) {
  const [open, setOpen] = useState(false);
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

  const addFreeDrinkWindow = () => {
    const newWindow: FreeDrinkWindow = {
      id: `window-${Date.now()}`,
      days: [1, 2, 3, 4, 5], // Default: weekdays
      start: '14:00',
      end: '16:00',
      timezone: 'Europe/Budapest'
    };
    
    setFormData(prev => ({
      ...prev,
      freeDrinkWindows: [...(prev.freeDrinkWindows || []), newWindow]
    }));
  };

  const removeFreeDrinkWindow = (id: string) => {
    setFormData(prev => ({
      ...prev,
      freeDrinkWindows: prev.freeDrinkWindows?.filter(w => w.id !== id) || []
    }));
  };

  const updateFreeDrinkWindow = (id: string, updates: Partial<FreeDrinkWindow>) => {
    setFormData(prev => ({
      ...prev,
      freeDrinkWindows: prev.freeDrinkWindows?.map(w => 
        w.id === id ? { ...w, ...updates } : w
      ) || []
    }));
  };

  const toggleDay = (windowId: string, day: number) => {
    const window = formData.freeDrinkWindows?.find(w => w.id === windowId);
    if (!window) return;

    const days = window.days.includes(day)
      ? window.days.filter(d => d !== day)
      : [...window.days, day].sort();

    updateFreeDrinkWindow(windowId, { days });
  };

  const updateCaps = (updates: Partial<RedemptionCap>) => {
    setFormData(prev => ({
      ...prev,
      caps: { ...prev.caps, ...updates }
    }));
  };

  const addImage = () => {
    const newImage: VenueImage = {
      id: `img-${Date.now()}`,
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
      id: `img-${Date.now()}`,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setOpen(false);
  };

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
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-cgi-muted">
              <TabsTrigger value="basic" className="text-cgi-surface-foreground">Alapok</TabsTrigger>
              <TabsTrigger value="contact" className="text-cgi-surface-foreground">Kapcsolat</TabsTrigger>
              <TabsTrigger value="images" className="text-cgi-surface-foreground">Képek</TabsTrigger>
              <TabsTrigger value="drinks" className="text-cgi-surface-foreground">Italok</TabsTrigger>
              <TabsTrigger value="schedule" className="text-cgi-surface-foreground">Időbeosztás</TabsTrigger>
              <TabsTrigger value="caps" className="text-cgi-surface-foreground">Limitek</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="cgi-input bg-cgi-surface border-cgi-muted text-cgi-surface-foreground"
                  required
                />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-cgi-surface-foreground">Szélesség (lat)</Label>
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
                  <Label className="text-cgi-surface-foreground">Hosszúság (lng)</Label>
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
              <DrinkSelector
                drinks={formData.drinks || []}
                onChange={(drinks) => setFormData(prev => ({ ...prev, drinks }))}
              />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-cgi-surface-foreground">Ingyenes ital időablakok</Label>
                <Button type="button" onClick={addFreeDrinkWindow} size="sm" className="cgi-button-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Új időablak
                </Button>
              </div>

              <div className="space-y-4">
                {formData.freeDrinkWindows?.map((window) => (
                  <Card key={window.id} className="p-4 cgi-card bg-cgi-surface border-cgi-muted">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-cgi-surface-foreground">Időablak</h4>
                        <Button
                          type="button"
                          onClick={() => removeFreeDrinkWindow(window.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-cgi-surface-foreground">Napok</Label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS.map(day => (
                            <Badge
                              key={day.value}
                              variant={window.days.includes(day.value) ? "default" : "outline"}
                              className={`cursor-pointer cgi-badge ${
                                window.days.includes(day.value) ? 'bg-cgi-secondary text-cgi-secondary-foreground' : ''
                              }`}
                              onClick={() => toggleDay(window.id, day.value)}
                            >
                              {day.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <TimeRangeInput
                        startTime={window.start}
                        endTime={window.end}
                        onStartTimeChange={(time) => updateFreeDrinkWindow(window.id, { start: time })}
                        onEndTimeChange={(time) => updateFreeDrinkWindow(window.id, { end: time })}
                      />
                    </div>
                  </Card>
                ))}

                {!formData.freeDrinkWindows?.length && (
                  <div className="text-center py-8 text-cgi-muted-foreground">
                    Még nincsenek időablakok beállítva. Kattints a "Új időablak" gombra a hozzáadáshoz.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="caps" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-cap" className="text-cgi-surface-foreground">Napi limit</Label>
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
          </Tabs>

          <div className="flex justify-end space-x-4 pt-4 border-t border-cgi-muted">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cgi-button-secondary">
              Mégse
            </Button>
            <Button type="submit" className="cgi-button-primary">
              {venue ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
