import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Promotion, Brand, PromotionRuleType, PromotionRuleConfig } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promotion?: Promotion | null;
  brands: Brand[];
}

const ruleTypeOptions: { value: PromotionRuleType; label: string }[] = [
  { value: 'category_multiplier', label: 'Kategória szorzó' },
  { value: 'brand_bonus', label: 'Márka bónusz' },
  { value: 'time_bonus', label: 'Időalapú bónusz' },
  { value: 'spending_tier', label: 'Költési szint' },
  { value: 'combo_bonus', label: 'Kombinációs bónusz' },
];

const categoryOptions = ['beer', 'cocktail', 'wine', 'spirits', 'soft_drink', 'food', 'snack'];
const dayLabels = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

const defaultForm = {
  name: '',
  description: '',
  rule_type: 'category_multiplier' as PromotionRuleType,
  starts_at: '',
  ends_at: '',
  active_days: [1, 2, 3, 4, 5, 6, 7],
  active_hours_start: '00:00',
  active_hours_end: '23:59',
  scope_type: 'global' as 'global' | 'venue_list',
  venue_ids: [] as string[],
  sponsor_brand_id: '',
  sponsor_covers_discount: false,
  max_uses_total: '',
  max_uses_per_user: '',
  priority: 0,
  is_active: true,
  // Rule-specific configs
  category: 'beer',
  multiplier: 2,
  brand_id: '',
  bonus_points: 10,
  discount_percent: 0,
  min_amount: 5000,
  required_categories: ['beer', 'food'],
};

export function PromotionFormModal({ isOpen, onClose, onSuccess, promotion, brands }: PromotionFormModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (promotion) {
      const config = promotion.rule_config as any;
      setForm({
        name: promotion.name,
        description: promotion.description || '',
        rule_type: promotion.rule_type,
        starts_at: promotion.starts_at.slice(0, 16), // Format for datetime-local
        ends_at: promotion.ends_at.slice(0, 16),
        active_days: promotion.active_days || [1, 2, 3, 4, 5, 6, 7],
        active_hours_start: promotion.active_hours?.start || '00:00',
        active_hours_end: promotion.active_hours?.end || '23:59',
        scope_type: (promotion.scope_type || 'global') as 'global' | 'venue_list',
        venue_ids: promotion.venue_ids || [],
        sponsor_brand_id: promotion.sponsor_brand_id || '',
        sponsor_covers_discount: promotion.sponsor_covers_discount || false,
        max_uses_total: promotion.max_uses_total?.toString() || '',
        max_uses_per_user: promotion.max_uses_per_user?.toString() || '',
        priority: promotion.priority || 0,
        is_active: promotion.is_active,
        category: config?.category || 'beer',
        multiplier: config?.multiplier || 2,
        brand_id: config?.brand_id || '',
        bonus_points: config?.bonus_points || 10,
        discount_percent: config?.discount_percent || 0,
        min_amount: config?.min_amount || 5000,
        required_categories: config?.required_categories || ['beer', 'food'],
      });
    } else {
      setForm({
        ...defaultForm,
        starts_at: new Date().toISOString().slice(0, 16),
        ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
    }
  }, [promotion, isOpen]);

  const buildRuleConfig = (): PromotionRuleConfig => {
    switch (form.rule_type) {
      case 'category_multiplier':
        return { category: form.category, multiplier: form.multiplier };
      case 'brand_bonus':
        return { 
          brand_id: form.brand_id, 
          bonus_points: form.bonus_points, 
          discount_percent: form.discount_percent 
        };
      case 'time_bonus':
        return { multiplier: form.multiplier };
      case 'spending_tier':
        return { min_amount: form.min_amount, bonus_points: form.bonus_points };
      case 'combo_bonus':
        return { required_categories: form.required_categories, bonus_points: form.bonus_points };
      default:
        return { category: form.category, multiplier: form.multiplier };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        name: form.name,
        description: form.description || null,
        rule_type: form.rule_type,
        rule_config: buildRuleConfig(),
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        active_days: form.active_days,
        active_hours: { start: form.active_hours_start, end: form.active_hours_end },
        scope_type: form.scope_type,
        venue_ids: form.scope_type === 'venue_list' ? form.venue_ids : null,
        sponsor_brand_id: form.sponsor_brand_id || null,
        sponsor_covers_discount: form.sponsor_covers_discount,
        max_uses_total: form.max_uses_total ? parseInt(form.max_uses_total) : null,
        max_uses_per_user: form.max_uses_per_user ? parseInt(form.max_uses_per_user) : null,
        priority: form.priority,
        is_active: form.is_active,
      };

      if (promotion) {
        const { error } = await supabase
          .from('promotions')
          .update(data)
          .eq('id', promotion.id);
        if (error) throw error;
        toast({ title: "Mentve", description: "A promóció sikeresen frissítve" });
      } else {
        const { error } = await supabase
          .from('promotions')
          .insert([data]);
        if (error) throw error;
        toast({ title: "Létrehozva", description: "Az új promóció sikeresen létrehozva" });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni a promóciót",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      active_days: prev.active_days.includes(day)
        ? prev.active_days.filter(d => d !== day)
        : [...prev.active_days, day].sort()
    }));
  };

  const renderRuleConfig = () => {
    switch (form.rule_type) {
      case 'category_multiplier':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Kategória</Label>
              <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="cgi-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cgi-surface border-cgi-muted">
                  {categoryOptions.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Szorzó</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                value={form.multiplier}
                onChange={(e) => setForm(p => ({ ...p, multiplier: parseFloat(e.target.value) || 1 }))}
                className="cgi-input"
              />
            </div>
          </div>
        );

      case 'brand_bonus':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Márka</Label>
              <Select value={form.brand_id} onValueChange={(v) => setForm(p => ({ ...p, brand_id: v }))}>
                <SelectTrigger className="cgi-input">
                  <SelectValue placeholder="Válassz márkát" />
                </SelectTrigger>
                <SelectContent className="bg-cgi-surface border-cgi-muted">
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Bónusz pontok</Label>
              <Input
                type="number"
                min="0"
                value={form.bonus_points}
                onChange={(e) => setForm(p => ({ ...p, bonus_points: parseInt(e.target.value) || 0 }))}
                className="cgi-input"
              />
            </div>
          </div>
        );

      case 'time_bonus':
        return (
          <div className="space-y-2">
            <Label className="text-cgi-surface-foreground">Pont szorzó</Label>
            <Input
              type="number"
              step="0.5"
              min="1"
              value={form.multiplier}
              onChange={(e) => setForm(p => ({ ...p, multiplier: parseFloat(e.target.value) || 1 }))}
              className="cgi-input"
            />
            <p className="text-sm text-cgi-muted-foreground">
              A megadott időszak alatt minden pont ennyiszeresére nő.
            </p>
          </div>
        );

      case 'spending_tier':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Minimum összeg (HUF)</Label>
              <Input
                type="number"
                min="0"
                value={form.min_amount}
                onChange={(e) => setForm(p => ({ ...p, min_amount: parseInt(e.target.value) || 0 }))}
                className="cgi-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Bónusz pontok</Label>
              <Input
                type="number"
                min="0"
                value={form.bonus_points}
                onChange={(e) => setForm(p => ({ ...p, bonus_points: parseInt(e.target.value) || 0 }))}
                className="cgi-input"
              />
            </div>
          </div>
        );

      case 'combo_bonus':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Szükséges kategóriák</Label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map(cat => (
                  <label key={cat} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cgi-muted/30 cursor-pointer">
                    <Checkbox
                      checked={form.required_categories.includes(cat)}
                      onCheckedChange={(checked) => {
                        setForm(p => ({
                          ...p,
                          required_categories: checked
                            ? [...p.required_categories, cat]
                            : p.required_categories.filter(c => c !== cat)
                        }));
                      }}
                    />
                    <span className="text-sm text-cgi-surface-foreground">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Bónusz pontok</Label>
              <Input
                type="number"
                min="0"
                value={form.bonus_points}
                onChange={(e) => setForm(p => ({ ...p, bonus_points: parseInt(e.target.value) || 0 }))}
                className="cgi-input"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-cgi-surface border-cgi-muted">
        <DialogHeader>
          <DialogTitle className="text-cgi-surface-foreground">
            {promotion ? 'Promóció szerkesztése' : 'Új promóció létrehozása'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-cgi-surface-foreground">Név *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  className="cgi-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-cgi-surface-foreground">Prioritás</Label>
                <Input
                  id="priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                  className="cgi-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-cgi-surface-foreground">Leírás</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className="cgi-input"
                rows={2}
              />
            </div>
          </div>

          {/* Rule Type */}
          <div className="space-y-4 p-4 rounded-lg border border-cgi-muted bg-cgi-muted/10">
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Szabály típus *</Label>
              <Select 
                value={form.rule_type} 
                onValueChange={(v) => setForm(p => ({ ...p, rule_type: v as PromotionRuleType }))}
              >
                <SelectTrigger className="cgi-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cgi-surface border-cgi-muted">
                  {ruleTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderRuleConfig()}
          </div>

          {/* Timing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cgi-surface-foreground">Időzítés</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Kezdés *</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm(p => ({ ...p, starts_at: e.target.value }))}
                  className="cgi-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Vége *</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm(p => ({ ...p, ends_at: e.target.value }))}
                  className="cgi-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Aktív napok</Label>
              <div className="flex gap-2">
                {dayLabels.map((label, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index + 1)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      form.active_days.includes(index + 1)
                        ? 'bg-cgi-secondary text-cgi-primary'
                        : 'bg-cgi-muted/30 text-cgi-muted-foreground hover:bg-cgi-muted/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Aktív órák kezdete</Label>
                <Input
                  type="time"
                  value={form.active_hours_start}
                  onChange={(e) => setForm(p => ({ ...p, active_hours_start: e.target.value }))}
                  className="cgi-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Aktív órák vége</Label>
                <Input
                  type="time"
                  value={form.active_hours_end}
                  onChange={(e) => setForm(p => ({ ...p, active_hours_end: e.target.value }))}
                  className="cgi-input"
                />
              </div>
            </div>
          </div>

          {/* Sponsor */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cgi-surface-foreground">Szponzor (opcionális)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Szponzor márka</Label>
                <Select 
                  value={form.sponsor_brand_id || "none"} 
                  onValueChange={(v) => setForm(p => ({ ...p, sponsor_brand_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger className="cgi-input">
                    <SelectValue placeholder="Nincs" />
                  </SelectTrigger>
                  <SelectContent className="bg-cgi-surface border-cgi-muted">
                    <SelectItem value="none">Nincs</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.sponsor_covers_discount}
                  onCheckedChange={(v) => setForm(p => ({ ...p, sponsor_covers_discount: v }))}
                />
                <Label className="text-cgi-surface-foreground">Szponzor fizeti a kedvezményt</Label>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-cgi-surface-foreground">Korlátok</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Max összes használat</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.max_uses_total}
                  onChange={(e) => setForm(p => ({ ...p, max_uses_total: e.target.value }))}
                  className="cgi-input"
                  placeholder="Korlátlan"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-cgi-surface-foreground">Max használat / felhasználó</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.max_uses_per_user}
                  onChange={(e) => setForm(p => ({ ...p, max_uses_per_user: e.target.value }))}
                  className="cgi-input"
                  placeholder="Korlátlan"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm(p => ({ ...p, is_active: v }))}
            />
            <Label className="text-cgi-surface-foreground">Aktív</Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-cgi-muted">
            <Button type="button" variant="ghost" onClick={onClose} className="cgi-button-ghost">
              Mégse
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cgi-button-primary">
              {isSubmitting ? 'Mentés...' : (promotion ? 'Mentés' : 'Létrehozás')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
