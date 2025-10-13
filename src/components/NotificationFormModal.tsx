import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotificationTemplate } from '@/lib/types';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import { useToast } from '@/hooks/use-toast';
import { sessionManager } from '@/auth/mockSession';
import { Slider } from '@/components/ui/slider';

interface NotificationFormModalProps {
  open: boolean;
  onClose: () => void;
  template: NotificationTemplate | null;
  onSave: () => void;
}

export function NotificationFormModal({ open, onClose, template, onSave }: NotificationFormModalProps) {
  const { toast } = useToast();
  const provider = getDataProvider();
  const session = sessionManager.getCurrentSession();

  const [formData, setFormData] = useState<Partial<NotificationTemplate>>({
    title_hu: '',
    body_hu: '',
    title_en: '',
    body_en: '',
    icon: '🔔',
    deep_link: '',
    targeting: {
      geofence: { enabled: false, radius_meters: 500 },
      user_segment: 'all',
      platform: 'all'
    },
    send_mode: 'immediate',
    frequency_limit: {
      per_user_hours: 6,
      max_per_day: 2
    },
    quiet_hours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    },
    category: 'free_drink',
    priority: 'medium',
    is_active: true
  });

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      // Reset form for new template
      setFormData({
        title_hu: '',
        body_hu: '',
        title_en: '',
        body_en: '',
        icon: '🔔',
        deep_link: '',
        targeting: {
          geofence: { enabled: false, radius_meters: 500 },
          user_segment: 'all',
          platform: 'all'
        },
        send_mode: 'immediate',
        frequency_limit: {
          per_user_hours: 6,
          max_per_day: 2
        },
        quiet_hours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        },
        category: 'free_drink',
        priority: 'medium',
        is_active: true
      });
    }
  }, [template, open]);

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      body_hu: (prev.body_hu || '') + ` {${variable}}`
    }));
  };

  const handleSave = async () => {
    if (!formData.title_hu || !formData.body_hu) {
      toast({
        title: 'Hiányzó adatok',
        description: 'Kérjük, töltse ki a kötelező mezőket!',
        variant: 'destructive'
      });
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        created_by: session?.user.id || 'admin',
        created_at: template?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (template) {
        await provider.update('notification_templates', template.id, dataToSave);
        toast({ title: 'Értesítés frissítve!' });
      } else {
        await provider.create('notification_templates', dataToSave);
        toast({ title: 'Értesítés létrehozva!' });
      }
      onSave();
    } catch (err) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült menteni az értesítést',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Értesítés szerkesztése' : 'Új értesítés'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="content">Tartalom</TabsTrigger>
            <TabsTrigger value="targeting">Célzás</TabsTrigger>
            <TabsTrigger value="timing">Időzítés</TabsTrigger>
            <TabsTrigger value="settings">Beállítások</TabsTrigger>
            <TabsTrigger value="preview">Előnézet</TabsTrigger>
          </TabsList>

          {/* TARTALOM TAB */}
          <TabsContent value="content" className="space-y-4">
            <div>
              <Label htmlFor="title_hu">Cím (HU) *</Label>
              <Input
                id="title_hu"
                value={formData.title_hu}
                onChange={(e) => setFormData({ ...formData, title_hu: e.target.value })}
                placeholder="pl. Ingyen sör a közelben! 🍺"
              />
            </div>

            <div>
              <Label htmlFor="body_hu">Szöveg (HU) *</Label>
              <Textarea
                id="body_hu"
                value={formData.body_hu}
                onChange={(e) => setFormData({ ...formData, body_hu: e.target.value })}
                placeholder="pl. A {venue_name} kínálja! Gyere be {start_time}-ig!"
                rows={3}
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                <Button type="button" size="sm" variant="outline" onClick={() => insertVariable('venue_name')}>
                  +venue_name
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertVariable('drink_name')}>
                  +drink_name
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertVariable('start_time')}>
                  +start_time
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertVariable('end_time')}>
                  +end_time
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertVariable('distance_m')}>
                  +distance_m
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="title_en">Cím (EN)</Label>
              <Input
                id="title_en"
                value={formData.title_en || ''}
                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                placeholder="e.g. Free beer nearby! 🍺"
              />
            </div>

            <div>
              <Label htmlFor="body_en">Szöveg (EN)</Label>
              <Textarea
                id="body_en"
                value={formData.body_en || ''}
                onChange={(e) => setFormData({ ...formData, body_en: e.target.value })}
                placeholder="e.g. At {venue_name}! Come before {start_time}!"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="icon">Ikon emoji</Label>
              <Input
                id="icon"
                value={formData.icon || ''}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🔔"
                maxLength={2}
              />
            </div>

            <div>
              <Label htmlFor="deep_link">Deep link</Label>
              <Input
                id="deep_link"
                value={formData.deep_link || ''}
                onChange={(e) => setFormData({ ...formData, deep_link: e.target.value })}
                placeholder="rork://venue/{venue_id}"
              />
            </div>
          </TabsContent>

          {/* CÉLZÁS TAB */}
          <TabsContent value="targeting" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="geofence">Geofence célzás</Label>
                <p className="text-xs text-muted-foreground">
                  Csak a megadott sugarú körön belül
                </p>
              </div>
              <Switch
                id="geofence"
                checked={formData.targeting?.geofence?.enabled || false}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    targeting: {
                      ...formData.targeting!,
                      geofence: { ...formData.targeting?.geofence!, enabled: checked }
                    }
                  })
                }
              />
            </div>

            {formData.targeting?.geofence?.enabled && (
              <div>
                <Label>Sugár (méter): {formData.targeting?.geofence?.radius_meters || 500}m</Label>
                <Slider
                  value={[formData.targeting?.geofence?.radius_meters || 500]}
                  onValueChange={([value]) =>
                    setFormData({
                      ...formData,
                      targeting: {
                        ...formData.targeting!,
                        geofence: { ...formData.targeting?.geofence!, radius_meters: value }
                      }
                    })
                  }
                  min={100}
                  max={5000}
                  step={100}
                />
              </div>
            )}

            <div>
              <Label htmlFor="user_segment">Felhasználói szegmens</Label>
              <Select
                value={formData.targeting?.user_segment || 'all'}
                onValueChange={(value: 'new' | 'returning' | 'all') =>
                  setFormData({
                    ...formData,
                    targeting: { ...formData.targeting!, user_segment: value }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Minden felhasználó</SelectItem>
                  <SelectItem value="new">Új felhasználók</SelectItem>
                  <SelectItem value="returning">Visszatérő felhasználók</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={formData.targeting?.platform || 'all'}
                onValueChange={(value: 'ios' | 'android' | 'all') =>
                  setFormData({
                    ...formData,
                    targeting: { ...formData.targeting!, platform: value }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Minden platform</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* IDŐZÍTÉS TAB */}
          <TabsContent value="timing" className="space-y-4">
            <div>
              <Label htmlFor="send_mode">Küldési mód</Label>
              <Select
                value={formData.send_mode}
                onValueChange={(value: 'immediate' | 'scheduled' | 'event') =>
                  setFormData({ ...formData, send_mode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Azonnali</SelectItem>
                  <SelectItem value="scheduled">Ütemezett</SelectItem>
                  <SelectItem value="event">Esemény alapú</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.send_mode === 'scheduled' && (
              <div>
                <Label htmlFor="scheduled_at">Ütemezett időpont</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={formData.scheduled_at || ''}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                />
              </div>
            )}

            {formData.send_mode === 'event' && (
              <div>
                <Label htmlFor="event_type">Esemény típusa</Label>
                <Select
                  value={formData.event_type || ''}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz eseményt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_drink_start_15m">Free drink indulás előtt 15p</SelectItem>
                    <SelectItem value="free_drink_live">Free drink él most</SelectItem>
                    <SelectItem value="free_drink_last_30m">Free drink utolsó 30 perc</SelectItem>
                    <SelectItem value="points_earned">Pontjóváírás</SelectItem>
                    <SelectItem value="reward_available">Reward elérhető</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          {/* BEÁLLÍTÁSOK TAB */}
          <TabsContent value="settings" className="space-y-4">
            <div>
              <Label htmlFor="category">Kategória</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_drink">Ingyen ital</SelectItem>
                  <SelectItem value="points">Pontok</SelectItem>
                  <SelectItem value="reward">Jutalom</SelectItem>
                  <SelectItem value="venue_status">Venue státusz</SelectItem>
                  <SelectItem value="promo">Promóció</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioritás</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Alacsony</SelectItem>
                  <SelectItem value="medium">Közepes</SelectItem>
                  <SelectItem value="high">Magas</SelectItem>
                  <SelectItem value="critical">Kritikus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Max értesítés naponta</Label>
              <Input
                type="number"
                value={formData.frequency_limit?.max_per_day || 2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    frequency_limit: {
                      ...formData.frequency_limit!,
                      max_per_day: parseInt(e.target.value)
                    }
                  })
                }
              />
            </div>

            <div>
              <Label>Felhasználónkénti limit (óra)</Label>
              <Input
                type="number"
                value={formData.frequency_limit?.per_user_hours || 6}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    frequency_limit: {
                      ...formData.frequency_limit!,
                      per_user_hours: parseInt(e.target.value)
                    }
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="quiet_hours">Csendes órák</Label>
                <p className="text-xs text-muted-foreground">
                  Ne küldj értesítést ebben az időszakban
                </p>
              </div>
              <Switch
                id="quiet_hours"
                checked={formData.quiet_hours?.enabled || false}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    quiet_hours: { ...formData.quiet_hours!, enabled: checked }
                  })
                }
              />
            </div>

            {formData.quiet_hours?.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kezdés</Label>
                  <Input
                    type="time"
                    value={formData.quiet_hours?.start || '22:00'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quiet_hours: { ...formData.quiet_hours!, start: e.target.value }
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Vége</Label>
                  <Input
                    type="time"
                    value={formData.quiet_hours?.end || '08:00'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quiet_hours: { ...formData.quiet_hours!, end: e.target.value }
                      })
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Aktív</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </TabsContent>

          {/* ELŐNÉZET TAB */}
          <TabsContent value="preview" className="space-y-4">
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-4">📱 Előnézet</p>
              <div className="max-w-sm mx-auto bg-card border rounded-lg p-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{formData.icon || '🔔'}</div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm">{formData.title_hu || 'Cím'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formData.body_hu || 'Értesítés szövege'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  most • Rork App
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Mégse
          </Button>
          <Button onClick={handleSave}>
            {template ? 'Mentés' : 'Létrehozás'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
