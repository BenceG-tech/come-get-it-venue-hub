
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Gift, Utensils, Star, Percent, PartyPopper, Handshake } from "lucide-react";
import { Reward, RewardCategory, Venue } from "@/lib/types";
import { ImageUploadInput } from "@/components/ImageUploadInput";
import { supabaseProvider } from "@/lib/dataProvider/supabaseProvider";

interface RewardFormModalProps {
  reward?: Reward;
  onSubmit: (reward: Omit<Reward, 'id'>) => void;
  trigger?: React.ReactNode;
  venueId?: string;
}

const categoryOptions: { value: RewardCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'drink', label: 'Ital', icon: <Gift className="h-4 w-4" /> },
  { value: 'food', label: 'Étel', icon: <Utensils className="h-4 w-4" /> },
  { value: 'vip', label: 'VIP', icon: <Star className="h-4 w-4" /> },
  { value: 'discount', label: 'Kedvezmény', icon: <Percent className="h-4 w-4" /> },
  { value: 'experience', label: 'Élmény', icon: <PartyPopper className="h-4 w-4" /> },
  { value: 'partner', label: 'Partner', icon: <Handshake className="h-4 w-4" /> }
];

export function RewardFormModal({ reward, onSubmit, trigger, venueId = '' }: RewardFormModalProps) {
  const [open, setOpen] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [formData, setFormData] = useState({
    name: reward?.name || '',
    points_required: reward?.points_required || 0,
    valid_until: reward?.valid_until || '',
    active: reward?.active ?? true,
    description: reward?.description || '',
    venue_id: reward?.venue_id || venueId,
    image_url: reward?.image_url || '',
    category: reward?.category || undefined as RewardCategory | undefined,
    is_global: reward?.is_global ?? false,
    partner_id: reward?.partner_id || undefined as string | undefined,
    priority: reward?.priority ?? 0,
    terms_conditions: reward?.terms_conditions || '',
    max_redemptions: reward?.max_redemptions || undefined as number | undefined
  });

  // Fetch venues for partner selection
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const data = await supabaseProvider.getList<Venue>('venues');
        setVenues(data);
        // If no venueId provided but we have venues, use the first one
        if (!venueId && !reward?.venue_id && data.length > 0) {
          setFormData(prev => ({ ...prev, venue_id: data[0].id }));
        }
      } catch (error) {
        console.error('Failed to fetch venues:', error);
      }
    };
    if (open) {
      fetchVenues();
    }
  }, [open, venueId, reward?.venue_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      max_redemptions: formData.max_redemptions || null
    };
    onSubmit(submitData as Omit<Reward, 'id'>);
    setOpen(false);
    if (!reward) {
      setFormData({
        name: '',
        points_required: 0,
        valid_until: '',
        active: true,
        description: '',
        venue_id: venueId || (venues[0]?.id || ''),
        image_url: '',
        category: undefined,
        is_global: false,
        partner_id: undefined,
        priority: 0,
        terms_conditions: '',
        max_redemptions: undefined
      });
    }
  };

  const defaultTrigger = (
    <Button className="cgi-button-primary">
      {reward ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
      {reward ? 'Szerkesztés' : 'Új jutalom'}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-cgi-surface border-cgi-muted">
        <DialogHeader>
          <DialogTitle className="text-cgi-surface-foreground">
            {reward ? 'Jutalom szerkesztése' : 'Új jutalom létrehozása'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-cgi-surface-foreground">Jutalom neve *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="cgi-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points" className="text-cgi-surface-foreground">Szükséges pontok *</Label>
              <Input
                id="points"
                type="number"
                min={0}
                value={formData.points_required}
                onChange={(e) => setFormData(prev => ({ ...prev, points_required: parseInt(e.target.value) || 0 }))}
                className="cgi-input"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-cgi-surface-foreground">Prioritás</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                className="cgi-input"
                placeholder="Magasabb = előrébb"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-cgi-surface-foreground">Kategória</Label>
              <Select
                value={formData.category || ''}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  category: value as RewardCategory || undefined 
                }))}
              >
                <SelectTrigger className="cgi-input">
                  <SelectValue placeholder="Válassz kategóriát" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until" className="text-cgi-surface-foreground">Érvényesség vége *</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className="cgi-input"
                required
              />
            </div>
          </div>

          {/* Venue Selection */}
          <div className="space-y-2">
            <Label htmlFor="venue_id" className="text-cgi-surface-foreground">Helyszín *</Label>
            <Select
              value={formData.venue_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, venue_id: value }))}
            >
              <SelectTrigger className="cgi-input">
                <SelectValue placeholder="Válassz helyszínt" />
              </SelectTrigger>
              <SelectContent>
                {venues.map(venue => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Partner Venue (if category is partner) */}
          {formData.category === 'partner' && (
            <div className="space-y-2">
              <Label htmlFor="partner_id" className="text-cgi-surface-foreground">Partner helyszín</Label>
              <Select
                value={formData.partner_id || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, partner_id: value || undefined }))}
              >
                <SelectTrigger className="cgi-input">
                  <SelectValue placeholder="Válassz partner helyszínt" />
                </SelectTrigger>
                <SelectContent>
                  {venues.filter(v => v.id !== formData.venue_id).map(venue => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-cgi-surface-foreground">Leírás</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="cgi-input resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms" className="text-cgi-surface-foreground">Feltételek / Apróbetűs</Label>
            <Textarea
              id="terms"
              value={formData.terms_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
              className="cgi-input resize-none"
              rows={2}
              placeholder="Pl.: Érvényes csak hétköznapokon..."
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-cgi-surface-foreground">Kép</Label>
            <div className="flex items-center gap-4">
              {formData.image_url && (
                <img 
                  src={formData.image_url} 
                  alt="Reward" 
                  className="h-16 w-16 object-cover rounded-md"
                />
              )}
              <ImageUploadInput
                onUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                buttonLabel={formData.image_url ? "Kép cseréje" : "Kép feltöltése"}
                folder="rewards"
                variant="outline"
                size="sm"
              />
            </div>
          </div>

          {/* Max Redemptions */}
          <div className="space-y-2">
            <Label htmlFor="max_redemptions" className="text-cgi-surface-foreground">Max beváltás (opcionális)</Label>
            <Input
              id="max_redemptions"
              type="number"
              min={1}
              value={formData.max_redemptions || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                max_redemptions: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              className="cgi-input"
              placeholder="Korlátlan, ha üres"
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="active" className="text-cgi-surface-foreground">Aktív</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_global" className="text-cgi-surface-foreground">Globális jutalom</Label>
                <p className="text-xs text-cgi-muted-foreground">Minden helyszínen elérhető</p>
              </div>
              <Switch
                id="is_global"
                checked={formData.is_global}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_global: checked }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cgi-button-secondary">
              Mégse
            </Button>
            <Button type="submit" className="cgi-button-primary">
              {reward ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
