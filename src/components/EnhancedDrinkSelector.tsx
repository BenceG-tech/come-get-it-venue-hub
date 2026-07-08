import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Pencil, ImageIcon, X } from 'lucide-react';
import { VenueDrink, FreeDrinkWindow } from '@/lib/types';
import { SimpleImageInput } from './SimpleImageInput';
import { TimeRangeInput } from './TimeRangeInput';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
  'other',
];

const DAYS = [
  { value: 1, short: 'H', label: 'Hétfő' },
  { value: 2, short: 'K', label: 'Kedd' },
  { value: 3, short: 'Sze', label: 'Szerda' },
  { value: 4, short: 'Cs', label: 'Csütörtök' },
  { value: 5, short: 'P', label: 'Péntek' },
  { value: 6, short: 'Szo', label: 'Szombat' },
  { value: 7, short: 'V', label: 'Vasárnap' },
];

type DraftDrink = Partial<VenueDrink> & { id?: string; venue_id?: string };
type DraftWindow = FreeDrinkWindow;

const defaultDrink = (): DraftDrink => ({
  id: crypto.randomUUID(),
  venue_id: '',
  drinkName: '',
  category: '',
  abv: 0,
  is_sponsored: false,
  is_free_drink: true,
  description: '',
  ingredients: [],
  serving_style: '',
  image_url: '',
});

const defaultWindow = (drinkId: string): DraftWindow => ({
  id: crypto.randomUUID(),
  venue_id: '',
  drink_id: drinkId,
  days: [1, 2, 3, 4, 5, 6, 7],
  start: '00:00',
  end: '23:59',
  timezone: 'Europe/Budapest',
});

const todayIsoDay = () => {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
};

const formatDays = (days: number[]) => {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Mindennap';
  if (sorted.join(',') === '1,2,3,4,5') return 'Hétköznap';
  if (sorted.join(',') === '6,7') return 'Hétvége';
  return sorted.map(day => DAYS.find(d => d.value === day)?.short).filter(Boolean).join(', ');
};

const windowSummary = (windows: FreeDrinkWindow[]) => {
  if (!windows.length) return 'Nincs időablak';
  const first = windows[0];
  const extra = windows.length > 1 ? ` +${windows.length - 1}` : '';
  return `${formatDays(first.days)} ${first.start}–${first.end}${extra}`;
};

export const EnhancedDrinkSelector = forwardRef<EnhancedDrinkSelectorRef, EnhancedDrinkSelectorProps>(({
  drinks,
  freeDrinkWindows,
  onChange,
  onFreeDrinkWindowsChange,
}, ref) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftDrink, setDraftDrink] = useState<DraftDrink>(() => defaultDrink());
  const [draftWindows, setDraftWindows] = useState<DraftWindow[]>([]);

  const freeDrinkCount = useMemo(() => drinks.filter(d => d.is_free_drink).length, [drinks]);

  useImperativeHandle(ref, () => ({
    flushStaged: async () => ({ success: true, drinks, windows: freeDrinkWindows }),
  }), [drinks, freeDrinkWindows]);

  const getDrinkWindows = (drinkId: string) => freeDrinkWindows.filter(window => window.drink_id === drinkId);

  const openNewDrink = () => {
    const drink = defaultDrink();
    setEditingId(null);
    setDraftDrink(drink);
    setDraftWindows([defaultWindow(drink.id!)]);
    setEditorOpen(true);
  };

  const openEditDrink = (drink: VenueDrink) => {
    const windows = getDrinkWindows(drink.id);
    setEditingId(drink.id);
    setDraftDrink({ ...drink });
    setDraftWindows(drink.is_free_drink && windows.length === 0 ? [defaultWindow(drink.id)] : windows.map(w => ({ ...w, days: [...w.days] })));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const saveDraft = () => {
    const name = draftDrink.drinkName?.trim();
    if (!name) {
      toast({ title: 'Hiányzó név', description: 'Add meg az ital nevét.', variant: 'destructive' as any });
      return;
    }

    const drinkId = draftDrink.id || crypto.randomUUID();
    const isFreeDrink = !!draftDrink.is_free_drink;
    const windowsToSave = isFreeDrink
      ? (draftWindows.length ? draftWindows : [defaultWindow(drinkId)]).map(window => ({ ...window, drink_id: drinkId }))
      : [];

    for (const window of windowsToSave) {
      if (!window.days.length) {
        toast({ title: 'Időablak hiba', description: 'Legalább egy napot válassz ki.', variant: 'destructive' as any });
        return;
      }
      if (window.start >= window.end) {
        toast({ title: 'Időablak hiba', description: 'A záró időpont legyen később, mint a kezdő.', variant: 'destructive' as any });
        return;
      }
    }

    const savedDrink: VenueDrink = {
      id: drinkId,
      venue_id: draftDrink.venue_id || '',
      drinkName: name,
      category: draftDrink.category || undefined,
      abv: draftDrink.abv || undefined,
      is_sponsored: !!draftDrink.is_sponsored,
      brand_id: draftDrink.brand_id || undefined,
      is_free_drink: isFreeDrink,
      description: draftDrink.description || undefined,
      ingredients: draftDrink.ingredients || [],
      serving_style: draftDrink.serving_style || undefined,
      image_url: draftDrink.image_url || undefined,
    };

    const nextDrinks = editingId
      ? drinks.map(drink => drink.id === editingId ? savedDrink : drink)
      : [...drinks, savedDrink];

    const nextWindows = [
      ...freeDrinkWindows.filter(window => window.drink_id !== drinkId),
      ...windowsToSave,
    ];

    onChange(nextDrinks);
    onFreeDrinkWindowsChange(nextWindows);
    toast({ title: editingId ? 'Ital frissítve' : 'Ital hozzáadva', description: isFreeDrink ? 'Az időablak is mentésre került.' : undefined });
    closeEditor();
  };

  const removeDrink = (id: string) => {
    onChange(drinks.filter(drink => drink.id !== id));
    onFreeDrinkWindowsChange(freeDrinkWindows.filter(window => window.drink_id !== id));
  };

  const setFreeDrink = (checked: boolean) => {
    setDraftDrink(prev => ({ ...prev, is_free_drink: checked }));
    if (checked && draftWindows.length === 0) {
      setDraftWindows([defaultWindow(draftDrink.id || crypto.randomUUID())]);
    }
  };

  const updateWindow = (id: string, updates: Partial<FreeDrinkWindow>) => {
    setDraftWindows(prev => prev.map(window => window.id === id ? { ...window, ...updates } : window));
  };

  const toggleDay = (id: string, day: number) => {
    setDraftWindows(prev => prev.map(window => {
      if (window.id !== id) return window;
      const days = window.days.includes(day)
        ? window.days.filter(d => d !== day)
        : [...window.days, day].sort((a, b) => a - b);
      return { ...window, days };
    }));
  };

  const applyPreset = (id: string, preset: 'all' | 'weekdays' | 'today' | 'now') => {
    const now = new Date();
    const nextHour = `${String(now.getHours()).padStart(2, '0')}:00`;
    const updates: Partial<FreeDrinkWindow> = preset === 'all'
      ? { days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '23:59' }
      : preset === 'weekdays'
        ? { days: [1, 2, 3, 4, 5], start: '10:00', end: '18:00' }
        : preset === 'today'
          ? { days: [todayIsoDay()], start: '00:00', end: '23:59' }
          : { days: [todayIsoDay()], start: nextHour, end: '23:59' };
    updateWindow(id, updates);
  };

  const addWindow = () => {
    const drinkId = draftDrink.id || crypto.randomUUID();
    if (!draftDrink.id) setDraftDrink(prev => ({ ...prev, id: drinkId }));
    setDraftWindows(prev => [...prev, defaultWindow(drinkId)]);
  };

  const editor = (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-cgi-surface-foreground text-sm">Ital neve</Label>
            <Input
              value={draftDrink.drinkName || ''}
              onChange={(event) => setDraftDrink(prev => ({ ...prev, drinkName: event.target.value }))}
              placeholder="pl. Midnight Tonic"
              className="cgi-input h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-cgi-surface-foreground text-sm">Kategória</Label>
            <Select value={draftDrink.category || ''} onValueChange={(value) => setDraftDrink(prev => ({ ...prev, category: value }))}>
              <SelectTrigger className="cgi-input h-10"><SelectValue placeholder="Válassz" /></SelectTrigger>
              <SelectContent>
                {DRINK_CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SimpleImageInput
          value={draftDrink.image_url || ''}
          onChange={(url) => setDraftDrink(prev => ({ ...prev, image_url: url }))}
          placeholder="Kép URL"
        />

        <div className="flex items-center justify-between rounded-md border border-cgi-muted bg-cgi-muted/10 p-3">
          <div>
            <Label className="text-cgi-surface-foreground">Ingyenes ital</Label>
            <p className="text-xs text-cgi-muted-foreground mt-0.5">Bekapcsolva automatikusan kap használható időablakot.</p>
          </div>
          <Switch checked={!!draftDrink.is_free_drink} onCheckedChange={setFreeDrink} />
        </div>

        {!!draftDrink.is_free_drink && (
          <div className="space-y-3 rounded-md border border-cgi-muted bg-cgi-muted/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-cgi-surface-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-cgi-primary" /> Időablakok
              </Label>
              <Button type="button" size="sm" variant="outline" className="cgi-button-secondary h-8 px-2 text-xs" onClick={addWindow}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Új
              </Button>
            </div>

            {draftWindows.map((window, index) => (
              <div key={window.id} className="space-y-3 rounded-md border border-cgi-muted bg-cgi-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-cgi-surface-foreground">#{index + 1} {windowSummary([window])}</span>
                  {draftWindows.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-cgi-error" onClick={() => setDraftWindows(prev => prev.filter(w => w.id !== window.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" size="sm" className="cgi-button-secondary h-8 text-xs" onClick={() => applyPreset(window.id, 'all')}>Mindennap</Button>
                  <Button type="button" variant="outline" size="sm" className="cgi-button-secondary h-8 text-xs" onClick={() => applyPreset(window.id, 'weekdays')}>Hétköznap</Button>
                  <Button type="button" variant="outline" size="sm" className="cgi-button-secondary h-8 text-xs" onClick={() => applyPreset(window.id, 'today')}>Ma egész nap</Button>
                  <Button type="button" variant="outline" size="sm" className="cgi-button-secondary h-8 text-xs" onClick={() => applyPreset(window.id, 'now')}>Mostantól</Button>
                </div>
                <TimeRangeInput
                  startTime={window.start}
                  endTime={window.end}
                  onStartTimeChange={(time) => updateWindow(window.id, { start: time })}
                  onEndTimeChange={(time) => updateWindow(window.id, { end: time })}
                  startLabel="Kezdés"
                  endLabel="Vége"
                />
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => {
                    const active = window.days.includes(day.value);
                    return (
                      <Button
                        key={day.value}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => toggleDay(window.id, day.value)}
                        className={cn(
                          'h-8 min-w-9 px-2 text-xs',
                          active ? 'border-cgi-primary bg-cgi-primary/15 text-cgi-primary' : 'cgi-button-secondary'
                        )}
                      >
                        {day.short}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-cgi-surface-foreground text-sm">Leírás</Label>
          <Textarea
            value={draftDrink.description || ''}
            onChange={(event) => setDraftDrink(prev => ({ ...prev, description: event.target.value }))}
            placeholder="Rövid leírás"
            className="cgi-input min-h-20"
          />
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-cgi-muted pt-2 mt-2 flex gap-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        <Button type="button" variant="outline" className="cgi-button-secondary flex-1 h-10" onClick={closeEditor}>Mégse</Button>
        <Button type="button" className="cgi-button-primary flex-1 h-10" onClick={saveDraft}>Mentés</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-cgi-surface-foreground font-semibold">Italok</Label>
          <p className="text-xs text-cgi-muted-foreground mt-0.5">{drinks.length} ital, {freeDrinkCount} ingyenes</p>
        </div>
        <Button type="button" onClick={openNewDrink} className="cgi-button-primary h-9 px-3 text-sm">
          <Plus className="h-4 w-4 mr-1" /> Ital
        </Button>
      </div>

      <div className="space-y-2">
        {drinks.map(drink => {
          const windows = getDrinkWindows(drink.id);
          const hasProblem = drink.is_free_drink && windows.length === 0;
          return (
            <div key={drink.id} className="rounded-md border border-cgi-muted bg-cgi-muted/10 p-2.5">
              <div className="flex items-center gap-2">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-cgi-muted/40 border border-cgi-muted">
                  {drink.image_url ? (
                    <img src={drink.image_url} alt={drink.drinkName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-cgi-muted-foreground" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="truncate text-sm font-medium text-cgi-surface-foreground">{drink.drinkName}</p>
                    {drink.is_free_drink && <Badge className="bg-cgi-primary/15 text-cgi-primary border border-cgi-primary/30 text-[10px] px-1.5 py-0">Ingyenes</Badge>}
                  </div>
                  <p className={cn('text-xs truncate mt-0.5', hasProblem ? 'text-cgi-error' : 'text-cgi-muted-foreground')}>
                    {drink.category || 'Nincs kategória'} · {drink.is_free_drink ? windowSummary(windows) : 'Normál ital'}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="cgi-button-secondary h-9 w-9 p-0" onClick={() => openEditDrink(drink)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-cgi-error hover:text-cgi-error" onClick={() => removeDrink(drink.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {drinks.length === 0 && (
          <button type="button" onClick={openNewDrink} className="w-full rounded-md border border-dashed border-cgi-muted bg-cgi-muted/10 py-8 text-center text-cgi-muted-foreground hover:border-cgi-primary hover:text-cgi-primary transition-colors">
            <Plus className="mx-auto mb-2 h-6 w-6" />
            <span className="text-sm">Első ital hozzáadása</span>
          </button>
        )}
      </div>

      {isMobile ? (
        <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
          <SheetContent side="bottom" className="h-[92vh] bg-cgi-surface border-cgi-muted px-3 pt-3 pb-2 flex flex-col">
            <SheetHeader className="mb-2 flex-shrink-0">
              <div className="flex items-center justify-between pr-7">
                <SheetTitle className="text-cgi-surface-foreground text-base">{editingId ? 'Ital szerkesztése' : 'Új ital'}</SheetTitle>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={closeEditor}><X className="h-4 w-4" /></Button>
              </div>
            </SheetHeader>
            {editor}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-2xl h-[86vh] bg-cgi-surface border-cgi-muted flex flex-col">
            <DialogHeader><DialogTitle className="text-cgi-surface-foreground">{editingId ? 'Ital szerkesztése' : 'Új ital'}</DialogTitle></DialogHeader>
            {editor}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

EnhancedDrinkSelector.displayName = 'EnhancedDrinkSelector';