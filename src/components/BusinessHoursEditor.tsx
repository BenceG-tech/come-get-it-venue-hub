
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BusinessHours, DayHours } from '@/lib/types';

interface BusinessHoursEditorProps {
  initialHours?: BusinessHours;
  onSave: (hours: BusinessHours) => Promise<void>;
}

const DAYS = [
  { key: 1, label: 'Hétfő' },
  { key: 2, label: 'Kedd' },
  { key: 3, label: 'Szerda' },
  { key: 4, label: 'Csütörtök' },
  { key: 5, label: 'Péntek' },
  { key: 6, label: 'Szombat' },
  { key: 7, label: 'Vasárnap' },
];

export default function BusinessHoursEditor({ initialHours, onSave }: BusinessHoursEditorProps) {
  const [hours, setHours] = useState<BusinessHours>(() => {
    if (initialHours) return initialHours;
    
    // Default hours: closed on all days
    const defaultHours: BusinessHours = { byDay: {} };
    DAYS.forEach(day => {
      defaultHours.byDay[day.key] = { open: null, close: null };
    });
    return defaultHours;
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Update hours from props when they change
  useEffect(() => {
    if (initialHours) {
      setHours(initialHours);
    }
  }, [initialHours]);

  const isOpen = (dayKey: number): boolean => {
    return hours.byDay[dayKey]?.open !== null;
  };

  const toggleDay = (dayKey: number, open: boolean) => {
    setHours(prev => ({
      ...prev,
      byDay: {
        ...prev.byDay,
        [dayKey]: open 
          ? { open: '09:00', close: '17:00' }
          : { open: null, close: null }
      }
    }));
  };

  const updateDayTime = (dayKey: number, field: 'open' | 'close', value: string) => {
    setHours(prev => ({
      ...prev,
      byDay: {
        ...prev.byDay,
        [dayKey]: {
          ...prev.byDay[dayKey],
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    // Validate times
    for (const dayKey of Object.keys(hours.byDay)) {
      const dayHours = hours.byDay[parseInt(dayKey)];
      if (dayHours.open && dayHours.close) {
        if (dayHours.open >= dayHours.close) {
          toast({
            title: 'Hibás időpontok',
            description: 'A nyitás időpontja korábbi kell legyen, mint a zárás.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      await onSave(hours);
      toast({
        title: 'Siker',
        description: 'Nyitvatartás sikeresen mentve.',
      });
    } catch (error: any) {
      toast({
        title: 'Hiba',
        description: error.message || 'Nem sikerült menteni a nyitvatartást.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="cgi-card">
      <div className="cgi-card-header">
        <h3 className="cgi-card-title flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Nyitvatartás
        </h3>
      </div>

      <div className="space-y-4">
        {DAYS.map(day => (
          <div key={day.key} className="p-3 bg-cgi-muted/10 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={isOpen(day.key)}
                  onCheckedChange={(open) => toggleDay(day.key, open)}
                />
                <Label className="font-medium text-cgi-surface-foreground min-w-[80px]">
                  {day.label}
                </Label>
              </div>
              
              {!isOpen(day.key) && (
                <span className="text-cgi-muted-foreground font-medium">Zárva</span>
              )}
            </div>
            
            {isOpen(day.key) && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 sm:justify-end">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="time"
                    value={hours.byDay[day.key]?.open || ''}
                    onChange={(e) => updateDayTime(day.key, 'open', e.target.value)}
                    className="flex-1 sm:w-32 cgi-input"
                  />
                  <span className="text-cgi-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={hours.byDay[day.key]?.close || ''}
                    onChange={(e) => updateDayTime(day.key, 'close', e.target.value)}
                    className="flex-1 sm:w-32 cgi-input"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 border-t border-cgi-muted">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full cgi-button-primary"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Mentés...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Nyitvatartás mentése
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
