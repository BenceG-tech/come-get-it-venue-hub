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
import { Venue, FreeDrinkWindow, RedemptionCap } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';

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
      <DialogContent className="sm:max-w-[800px] bg-cgi-surface border-cgi-muted max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-cgi-surface-foreground">
            {venue ? 'Helyszín szerkesztése' : 'Új helyszín'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-cgi-muted">
              <TabsTrigger value="basic" className="text-cgi-surface-foreground">Alapok</TabsTrigger>
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
