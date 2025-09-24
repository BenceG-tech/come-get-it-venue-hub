import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Upload, Clock } from 'lucide-react';
import { VenueDrink, FreeDrinkWindow } from '@/lib/types';
import { SimpleImageInput } from './SimpleImageInput';
import { TimeRangeInput } from './TimeRangeInput';

interface EnhancedDrinkSelectorProps {
  drinks: VenueDrink[];
  freeDrinkWindows: FreeDrinkWindow[];
  onChange: (drinks: VenueDrink[]) => void;
  onFreeDrinkWindowsChange: (windows: FreeDrinkWindow[]) => void;
}

const DRINK_CATEGORIES = [
  'cocktail',
  'beer',
  'wine',
  'spirits',
  'non-alcoholic',
  'coffee',
  'tea',
  'other'
];

const DAYS = [
  { value: 1, label: 'Hétfő' },
  { value: 2, label: 'Kedd' },
  { value: 3, label: 'Szerda' },
  { value: 4, label: 'Csütörtök' },
  { value: 5, label: 'Péntek' },
  { value: 6, label: 'Szombat' },
  { value: 7, label: 'Vasárnap' },
];

export function EnhancedDrinkSelector({ 
  drinks, 
  freeDrinkWindows, 
  onChange, 
  onFreeDrinkWindowsChange 
}: EnhancedDrinkSelectorProps) {
  const [newDrink, setNewDrink] = useState<Partial<VenueDrink>>({
    drinkName: '',
    category: '',
    abv: 0,
    is_sponsored: false,
    is_free_drink: false,
    description: '',
    ingredients: [],
    serving_style: '',
    image_url: ''
  });

  const [expandedDrink, setExpandedDrink] = useState<string | null>(null);

  const addDrink = () => {
    if (!newDrink.drinkName?.trim()) return;

    const drink: VenueDrink = {
      id: crypto.randomUUID(),
      venue_id: '', // Will be set when venue is saved
      drinkName: newDrink.drinkName,
      category: newDrink.category || undefined,
      abv: newDrink.abv || undefined,
      is_sponsored: newDrink.is_sponsored || false,
      brand_id: newDrink.brand_id || undefined,
      is_free_drink: newDrink.is_free_drink || false,
      description: newDrink.description || undefined,
      ingredients: newDrink.ingredients || [],
      serving_style: newDrink.serving_style || undefined,
      image_url: newDrink.image_url || undefined
    };

    onChange([...drinks, drink]);
    setNewDrink({
      drinkName: '',
      category: '',
      abv: 0,
      is_sponsored: false,
      is_free_drink: false,
      description: '',
      ingredients: [],
      serving_style: '',
      image_url: ''
    });
  };

  const removeDrink = (id: string) => {
    onChange(drinks.filter(drink => drink.id !== id));
    // Remove associated time windows
    onFreeDrinkWindowsChange(freeDrinkWindows.filter(window => window.drink_id !== id));
  };

  const updateDrink = (id: string, updates: Partial<VenueDrink>) => {
    onChange(drinks.map(drink => 
      drink.id === id ? { ...drink, ...updates } : drink
    ));
  };

  const addTimeWindow = (drinkId: string) => {
    const newWindow: FreeDrinkWindow = {
      id: crypto.randomUUID(),
      venue_id: '', // Will be set when venue is saved
      drink_id: drinkId,
      days: [1, 2, 3, 4, 5], // Default: weekdays
      start: '14:00',
      end: '16:00',
      timezone: 'Europe/Budapest'
    };
    onFreeDrinkWindowsChange([...freeDrinkWindows, newWindow]);
  };

  const removeTimeWindow = (windowId: string) => {
    onFreeDrinkWindowsChange(freeDrinkWindows.filter(w => w.id !== windowId));
  };

  const updateTimeWindow = (windowId: string, updates: Partial<FreeDrinkWindow>) => {
    onFreeDrinkWindowsChange(freeDrinkWindows.map(window =>
      window.id === windowId ? { ...window, ...updates } : window
    ));
  };

  const toggleDay = (windowId: string, day: number) => {
    const window = freeDrinkWindows.find(w => w.id === windowId);
    if (!window) return;

    const newDays = window.days.includes(day)
      ? window.days.filter(d => d !== day)
      : [...window.days, day].sort();

    updateTimeWindow(windowId, { days: newDays });
  };

  const getDrinkWindows = (drinkId: string) => {
    return freeDrinkWindows.filter(window => window.drink_id === drinkId);
  };

  return (
    <div className="space-y-6">
      {/* Existing Drinks */}
      <div className="space-y-4">
        <Label className="text-cgi-surface-foreground text-lg font-semibold">Italok kezelése</Label>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {drinks.map((drink) => (
            <Card key={drink.id} className="p-4 cgi-card">
              <div className="space-y-3">
                {/* Basic drink info */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-3 gap-3 items-center">
                    <Input
                      value={drink.drinkName}
                      onChange={(e) => updateDrink(drink.id, { drinkName: e.target.value })}
                      className="cgi-input"
                      placeholder="Ital neve"
                    />
                    <Select 
                      value={drink.category || ''} 
                      onValueChange={(value) => updateDrink(drink.id, { category: value })}
                    >
                      <SelectTrigger className="cgi-input">
                        <SelectValue placeholder="Kategória" />
                      </SelectTrigger>
                      <SelectContent>
                        {DRINK_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={drink.is_free_drink}
                        onCheckedChange={(checked) => updateDrink(drink.id, { is_free_drink: !!checked })}
                      />
                      <span className="text-sm text-cgi-muted-foreground">Ingyenes</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      type="button"
                      onClick={() => setExpandedDrink(expandedDrink === drink.id ? null : drink.id)}
                      variant="outline"
                      size="sm"
                    >
                      {expandedDrink === drink.id ? 'Bezár' : 'Részletek'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => removeDrink(drink.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedDrink === drink.id && (
                  <div className="space-y-4 pt-4 border-t border-cgi-border">
                    {/* Image upload */}
                    <div className="space-y-2">
                      <Label className="text-cgi-surface-foreground">Ital képe</Label>
                      <SimpleImageInput
                        value={drink.image_url || ''}
                        onChange={(url) => updateDrink(drink.id, { image_url: url })}
                        placeholder="Kép URL vagy tölts fel képet"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-cgi-surface-foreground">Leírás</Label>
                      <Textarea
                        value={drink.description || ''}
                        onChange={(e) => updateDrink(drink.id, { description: e.target.value })}
                        placeholder="Ital leírása..."
                        className="cgi-input"
                      />
                    </div>

                    {/* Time windows for this drink */}
                    {drink.is_free_drink && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-cgi-surface-foreground">Ingyenes ital időablakok</Label>
                          <Button
                            type="button"
                            onClick={() => addTimeWindow(drink.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Időablak hozzáadása
                          </Button>
                        </div>
                        
                        {getDrinkWindows(drink.id).map((window) => (
                          <Card key={window.id} className="p-3 bg-cgi-surface-secondary">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Időablak</Label>
                                <Button
                                  type="button"
                                  onClick={() => removeTimeWindow(window.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              <TimeRangeInput
                                startTime={window.start}
                                endTime={window.end}
                                onStartTimeChange={(time) => updateTimeWindow(window.id, { start: time })}
                                onEndTimeChange={(time) => updateTimeWindow(window.id, { end: time })}
                                startLabel="Kezdés"
                                endLabel="Befejezés"
                              />

                              <div className="space-y-2">
                                <Label className="text-sm">Napok</Label>
                                <div className="flex flex-wrap gap-2">
                                  {DAYS.map((day) => (
                                    <Button
                                      key={day.value}
                                      type="button"
                                      onClick={() => toggleDay(window.id, day.value)}
                                      variant={window.days.includes(day.value) ? "default" : "outline"}
                                      size="sm"
                                      className="text-xs"
                                    >
                                      {day.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Add new drink */}
      <div className="space-y-3">
        <Label className="text-cgi-surface-foreground font-semibold">Új ital hozzáadása</Label>
        <Card className="p-4 cgi-card">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input
                value={newDrink.drinkName || ''}
                onChange={(e) => setNewDrink({ ...newDrink, drinkName: e.target.value })}
                placeholder="Ital neve"
                className="cgi-input"
              />
              <Select 
                value={newDrink.category || ''} 
                onValueChange={(value) => setNewDrink({ ...newDrink, category: value })}
              >
                <SelectTrigger className="cgi-input">
                  <SelectValue placeholder="Kategória" />
                </SelectTrigger>
                <SelectContent>
                  {DRINK_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={newDrink.is_free_drink || false}
                  onCheckedChange={(checked) => setNewDrink({ ...newDrink, is_free_drink: !!checked })}
                />
                <span className="text-sm text-cgi-muted-foreground">Ingyenes</span>
              </div>
            </div>

            <SimpleImageInput
              value={newDrink.image_url || ''}
              onChange={(url) => setNewDrink({ ...newDrink, image_url: url })}
              placeholder="Ital képe (opcionális)"
            />

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={addDrink}
                className="cgi-button-primary"
                disabled={!newDrink.drinkName?.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ital hozzáadása
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
