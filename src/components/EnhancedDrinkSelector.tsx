import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Trash2, Upload, Clock, HelpCircle } from 'lucide-react';
import { VenueDrink, FreeDrinkWindow } from '@/lib/types';
import { SimpleImageInput } from './SimpleImageInput';
import { TimeRangeInput } from './TimeRangeInput';

import { useToast } from '@/hooks/use-toast';

interface EnhancedDrinkSelectorProps {
  drinks: VenueDrink[];
  freeDrinkWindows: FreeDrinkWindow[];
  onChange: (drinks: VenueDrink[]) => void;
  onFreeDrinkWindowsChange: (windows: FreeDrinkWindow[]) => void;
}

export interface EnhancedDrinkSelectorRef {
  flushStaged(): Promise<{ 
    success: boolean; 
    error?: string;
    drinks?: VenueDrink[];
    windows?: FreeDrinkWindow[];
  }>;
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

export const EnhancedDrinkSelector = forwardRef<EnhancedDrinkSelectorRef, EnhancedDrinkSelectorProps>(({ 
  drinks, 
  freeDrinkWindows, 
  onChange, 
  onFreeDrinkWindowsChange,
}, ref) => {
  const { toast } = useToast();
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
  const [newWindows, setNewWindows] = useState<FreeDrinkWindow[]>([]);

  // Expose imperative handle for synchronous flushing
  useImperativeHandle(ref, () => ({
    flushStaged: async () => {
      console.log('[EnhancedDrinkSelector] flushStaged called', {
        hasNewDrink: !!newDrink.drinkName?.trim(),
        newDrinkName: newDrink.drinkName,
        newWindowsCount: newWindows.length,
        existingDrinksCount: drinks.length,
        existingWindowsCount: freeDrinkWindows.length
      });

      if (!newDrink.drinkName?.trim()) {
        console.log('[EnhancedDrinkSelector] No staged drink to flush, returning existing data');
        return { success: true, drinks, windows: freeDrinkWindows };
      }

      // Validate staged drink
      if (newDrink.is_free_drink && newWindows.length === 0) {
        toast({
          title: "Hiba", 
          description: `Az ingyenes ital ("${newDrink.drinkName}") nem rendelkezik időablakokkal. Adj hozzá legalább egy időablakot a mentés előtt.`,
          variant: "destructive"
        });
        return { success: false, error: "Free drink missing time windows" };
      }

      // Validate time windows
      if (newDrink.is_free_drink) {
        for (const window of newWindows) {
          if (window.days.length === 0) {
            toast({
              title: "Hiba",
              description: `Az ital ("${newDrink.drinkName}") egyik időablakjánál nincs kiválasztva nap.`,
              variant: "destructive"
            });
            return { success: false, error: "Time window missing days" };
          }
          if (window.start >= window.end) {
            toast({
              title: "Hiba", 
              description: `Az ital ("${newDrink.drinkName}") egyik időablakjánál a záró időpontnak a nyitó időpont után kell lennie.`,
              variant: "destructive"
            });
            return { success: false, error: "Invalid time window" };
          }
        }
      }

      // Add the drink
      try {
        const drinkId = crypto.randomUUID();
        const drink: VenueDrink = {
          id: drinkId,
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

        const updatedDrinks = [...drinks, drink];
        onChange(updatedDrinks);
        
        // Add time windows for the new drink if it's a free drink
        let updatedWindows = freeDrinkWindows;
        if (newDrink.is_free_drink && newWindows.length > 0) {
          const mappedWindows = newWindows.map(window => ({
            ...window,
            drink_id: drinkId,
            venue_id: ''
          }));
          updatedWindows = [...freeDrinkWindows, ...mappedWindows];
          onFreeDrinkWindowsChange(updatedWindows);
        }
        
        // Reset form
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
        setNewWindows([]);

        console.log('[EnhancedDrinkSelector] Successfully flushed staged drink', { 
          drinkName: drink.drinkName, 
          windowsCount: newWindows.length,
          totalDrinksAfterFlush: updatedDrinks.length,
          totalWindowsAfterFlush: updatedWindows.length
        });
        return { success: true, drinks: updatedDrinks, windows: updatedWindows };
      } catch (error) {
        console.error('[EnhancedDrinkSelector] Error flushing staged drink:', error);
        return { success: false, error: String(error) };
      }
    }
  }), [newDrink, newWindows, drinks, freeDrinkWindows, onChange, onFreeDrinkWindowsChange, toast]);
  const addDrink = () => {
    if (!newDrink.drinkName?.trim()) {
      toast({
        title: "Hiba",
        description: "Az ital neve kötelező mező.",
        variant: "destructive"
      });
      return;
    }
    
    // Validation: Free drinks must have at least one time window
    if (newDrink.is_free_drink && newWindows.length === 0) {
      toast({
        title: "Hiba", 
        description: "Ingyenes italoknál legalább egy időablak megadása kötelező.",
        variant: "destructive"
      });
      return;
    }

    // Validate time windows
    if (newDrink.is_free_drink) {
      for (const window of newWindows) {
        if (window.days.length === 0) {
          toast({
            title: "Hiba",
            description: "Minden időablaknál legalább egy napot ki kell választani.",
            variant: "destructive"
          });
          return;
        }
        if (window.start >= window.end) {
          toast({
            title: "Hiba", 
            description: "A záró időpontnak a nyitó időpont után kell lennie.",
            variant: "destructive"
          });
          return;
        }
      }
    }

    const drinkId = crypto.randomUUID();
    const drink: VenueDrink = {
      id: drinkId,
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
    
    // Add time windows for the new drink if it's a free drink
    if (newDrink.is_free_drink && newWindows.length > 0) {
      const mappedWindows = newWindows.map(window => ({
        ...window,
        drink_id: drinkId,
        venue_id: ''
      }));
      onFreeDrinkWindowsChange([...freeDrinkWindows, ...mappedWindows]);
    }
    
    // Reset form
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
    setNewWindows([]);
    
    // Optionally expand the newly added drink
    setExpandedDrink(drinkId);
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

  // New drink time window handlers
  const addNewTimeWindow = () => {
    const newWindow: FreeDrinkWindow = {
      id: crypto.randomUUID(),
      venue_id: '',
      drink_id: '', // Will be set when drink is added
      days: [1, 2, 3, 4, 5], // Default: weekdays
      start: '10:00',
      end: '14:00',
      timezone: 'Europe/Budapest'
    };
    setNewWindows([...newWindows, newWindow]);
  };

  const removeNewTimeWindow = (windowId: string) => {
    setNewWindows(newWindows.filter(w => w.id !== windowId));
  };

  const updateNewTimeWindow = (windowId: string, updates: Partial<FreeDrinkWindow>) => {
    setNewWindows(newWindows.map(window =>
      window.id === windowId ? { ...window, ...updates } : window
    ));
  };

  const toggleNewDay = (windowId: string, day: number) => {
    const window = newWindows.find(w => w.id === windowId);
    if (!window) return;

    const newDays = window.days.includes(day)
      ? window.days.filter(d => d !== day)
      : [...window.days, day].sort();

    updateNewTimeWindow(windowId, { days: newDays });
  };

  // Auto-add a default time window when marking as free drink
  const handleFreeDrinkToggle = (checked: boolean) => {
    setNewDrink({ ...newDrink, is_free_drink: checked });
    if (checked && newWindows.length === 0) {
      addNewTimeWindow();
    }
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 cursor-help">
                            <Checkbox
                              checked={drink.is_free_drink}
                              onCheckedChange={(checked) => updateDrink(drink.id, { is_free_drink: !!checked })}
                            />
                            <span className="text-sm text-cgi-muted-foreground">
                              Ingyenes {drink.is_free_drink && <Clock className="inline h-3 w-3 ml-1" />}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Ha bejelölöd, ez az ital ingyen lesz elérhető a megadott időablakokban.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      type="button"
                      onClick={() => setExpandedDrink(expandedDrink === drink.id ? null : drink.id)}
                      variant="outline"
                      size="sm"
                      className={drink.is_free_drink && getDrinkWindows(drink.id).length === 0 ? "border-orange-500 text-orange-600" : ""}
                    >
                      {expandedDrink === drink.id ? 'Bezár' : 'Részletek'}
                      {drink.is_free_drink && getDrinkWindows(drink.id).length === 0 && <Clock className="ml-1 h-3 w-3" />}
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
                      <div className="space-y-3 bg-cgi-muted/30 border border-cgi-muted rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-cgi-primary" />
                            <Label className="text-cgi-surface-foreground font-medium">Ingyenes ital időablakok</Label>
                            {getDrinkWindows(drink.id).length === 0 && (
                              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                Időablak szükséges!
                              </span>
                            )}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => addTimeWindow(drink.id)}
                                  size="sm"
                                  variant="outline"
                                  className="bg-cgi-muted/50 border-cgi-muted text-cgi-surface-foreground hover:bg-cgi-muted"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Időablak hozzáadása
                                  <HelpCircle className="h-3 w-3 ml-1 opacity-60" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Több időablakra akkor van szükség, ha az ingyenes ital különböző időszakokban érhető el (pl. reggel 10-12 ÉS este 18-21). Ha végig ugyanaz az időszak, elég egy időablak.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {getDrinkWindows(drink.id).length === 0 && (
                          <div className="text-sm text-orange-700 bg-orange-50 p-3 rounded border border-orange-200">
                            <strong>Figyelem:</strong> Az ingyenes italhoz legalább egy időablakot be kell állítani, hogy megjelenjen a vendégeknek.
                          </div>
                        )}
                        
                        {getDrinkWindows(drink.id).map((window, index) => (
                          <Card key={window.id} className="p-3 bg-cgi-surface border border-cgi-muted">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-cgi-surface-foreground">Időablak #{index + 1}</Label>
                                <Button
                                  type="button"
                                  onClick={() => removeTimeWindow(window.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
                                <Label className="text-sm text-cgi-surface-foreground">Napok</Label>
                                
                                {/* Quick selection buttons */}
                                <div className="flex gap-2 mb-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const weekdays = [1, 2, 3, 4, 5];
                                      updateTimeWindow(window.id, { days: weekdays });
                                    }}
                                    className="bg-cgi-muted/50 text-cgi-surface-foreground hover:bg-cgi-muted text-xs px-2 py-1 h-7"
                                  >
                                    H-P
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const allDays = [1, 2, 3, 4, 5, 6, 7];
                                      updateTimeWindow(window.id, { days: allDays });
                                    }}
                                    className="bg-cgi-muted/50 text-cgi-surface-foreground hover:bg-cgi-muted text-xs px-2 py-1 h-7"
                                  >
                                    H-V
                                  </Button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  {DAYS.map((day) => (
                                    <Button
                                      key={day.value}
                                      type="button"
                                      onClick={() => toggleDay(window.id, day.value)}
                                      variant="ghost"
                                      size="sm"
                                      className={`text-xs min-w-[40px] ${
                                        window.days.includes(day.value)
                                          ? 'bg-cgi-primary/20 text-cgi-primary border-cgi-primary/40 border hover:bg-cgi-primary/30'
                                          : 'bg-cgi-surface border-cgi-muted text-cgi-muted-foreground hover:bg-cgi-muted/50 border'
                                      }`}
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-help">
                      <Checkbox
                        checked={newDrink.is_free_drink || false}
                        onCheckedChange={handleFreeDrinkToggle}
                      />
                      <span className="text-sm text-cgi-muted-foreground">
                        Ingyenes {newDrink.is_free_drink && <Clock className="inline h-3 w-3 ml-1" />}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Ha bejelölöd, ez az ital ingyen lesz elérhető a megadott időablakokban.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <SimpleImageInput
              value={newDrink.image_url || ''}
              onChange={(url) => setNewDrink({ ...newDrink, image_url: url })}
              placeholder="Ital képe (opcionális)"
            />

            {/* Time windows for new free drink - moved directly under checkbox */}
            {newDrink.is_free_drink && (
              <div className="space-y-3 bg-cgi-muted/30 border border-cgi-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-cgi-primary" />
                    <Label className="text-cgi-surface-foreground font-medium">Ingyenes ital időablakok</Label>
                    {newWindows.length === 0 && (
                      <span className="text-xs text-orange-600 bg-orange-100/20 px-2 py-1 rounded border border-orange-200/30">
                        Időablak szükséges!
                      </span>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={addNewTimeWindow}
                          size="sm"
                          variant="outline"
                          className="bg-cgi-muted/50 border-cgi-muted text-cgi-surface-foreground hover:bg-cgi-muted"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Időablak hozzáadása
                          <HelpCircle className="h-3 w-3 ml-1 opacity-60" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Több időablakra akkor van szükség, ha az ingyenes ital különböző időszakokban érhető el (pl. reggel 10-12 ÉS este 18-21). Ha végig ugyanaz az időszak, elég egy időablak.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {newWindows.length === 0 && (
                  <div className="text-sm text-orange-600 bg-orange-100/20 p-3 rounded border border-orange-200/30">
                    <strong>Figyelem:</strong> Az ingyenes italhoz legalább egy időablakot be kell állítani, hogy megjelenjen a vendégeknek.
                  </div>
                )}
                
                {newWindows.map((window, index) => (
                  <Card key={window.id} className="p-3 bg-cgi-surface border border-cgi-muted">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-cgi-surface-foreground">Időablak #{index + 1}</Label>
                        <Button
                          type="button"
                          onClick={() => removeNewTimeWindow(window.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <TimeRangeInput
                        startTime={window.start}
                        endTime={window.end}
                        onStartTimeChange={(time) => updateNewTimeWindow(window.id, { start: time })}
                        onEndTimeChange={(time) => updateNewTimeWindow(window.id, { end: time })}
                        startLabel="Kezdés"
                        endLabel="Befejezés"
                      />

                      <div className="space-y-2">
                        <Label className="text-sm text-cgi-surface-foreground">Napok</Label>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <Button
                            type="button"
                            onClick={() => {
                              const weekdays = [1, 2, 3, 4, 5];
                              updateNewTimeWindow(window.id, { days: weekdays });
                            }}
                            variant="outline"
                            size="sm"
                            className="text-xs bg-cgi-muted/50 text-cgi-surface-foreground hover:bg-cgi-muted"
                          >
                            H-P
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              const allDays = [1, 2, 3, 4, 5, 6, 7];
                              updateNewTimeWindow(window.id, { days: allDays });
                            }}
                            variant="outline"
                            size="sm"
                            className="text-xs bg-cgi-muted/50 text-cgi-surface-foreground hover:bg-cgi-muted"
                          >
                            H-V
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {DAYS.map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              onClick={() => toggleNewDay(window.id, day.value)}
                              size="sm"
                              className={`text-xs ${
                                window.days.includes(day.value)
                                  ? 'bg-cgi-primary/20 text-cgi-primary border-cgi-primary/40 border hover:bg-cgi-primary/30'
                                  : 'bg-cgi-surface border-cgi-muted text-cgi-muted-foreground hover:bg-cgi-muted/50 border'
                              }`}
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

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={addDrink}
                className="cgi-button-primary"
                disabled={!newDrink.drinkName?.trim() || (newDrink.is_free_drink && newWindows.length === 0)}
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
});
