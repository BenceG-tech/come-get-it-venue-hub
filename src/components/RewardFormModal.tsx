
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
import { VenueVisibilityInfo } from "@/lib/rewardVisibility";
import { sessionManager } from "@/auth/session";

interface RewardFormModalProps {
  reward?: Reward;
  onSubmit: (reward: Omit<Reward, 'id'>) => void;
  trigger?: React.ReactNode;
  venueId?: string;
  /** Venues the current user may attach rewards to. Fetched when omitted. */
  venues?: VenueVisibilityInfo[];
}

const categoryOptions: { value: RewardCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'drink', label: 'Ital', icon: <Gift className="h-4 w-4" /> },
  { value: 'food', label: 'Étel', icon: <Utensils className="h-4 w-4" /> },
  { value: 'vip', label: 'VIP', icon: <Star className="h-4 w-4" /> },
  { value: 'discount', label: 'Kedvezmény', icon: <Percent className="h-4 w-4" /> },
  { value: 'experience', label: 'Élmény', icon: <PartyPopper className="h-4 w-4" /> },
  { value: 'partner', label: 'Partner', icon: <Handshake className="h-4 w-4" /> }
];

export function RewardFormModal({ reward, onSubmit, trigger, venueId = '', venues: venuesProp }: RewardFormModalProps) {
  const [open, setOpen] = useState(false);
  const [venues, setVenues] = useState<VenueVisibilityInfo[]>(venuesProp ?? []);
  const [formData, setFormData] = useState({
    name: reward?.name || '',
    points_required: reward?.points_required || 0,
    valid_until: reward?.valid_until || '',
    // New rewards start inactive so publishing is deliberate.
    active: reward?.active ?? false,
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

  const isAdmin = sessionManager.getRole() === 'cgi_admin';
  const myVenueIds = sessionManager.getCurrentSession()?.venues ?? [];

  useEffect(() => {
    if (venuesProp) {
      setVenues(venuesProp);
      return;
    }
    const fetchVenues = async () => {
      try {
        const data = await supabaseProvider.getList<Venue>('venues');
        // Owners / staff may only pick their membership venues (RLS is the backstop).
        setVenues(
          (data as unknown as VenueVisibilityInfo[]).filter((v) => isAdmin || myVenueIds.includes(v.id))
        );
      } catch {
        console.error('Failed to fetch venues for reward form');
      }
    };
    if (open) fetchVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, venuesProp]);

  const selectedVenue = formData.venue_id ? venues.find((v) => v.id === formData.venue_id) : undefined;
  const venuePaused = !formData.is_global && !!selectedVenue?.is_paused;
  // Global rewards need no venue; venue rewards do.
  const missingVenue = !formData.is_global && !formData.venue_id;
  const canPublish = !venuePaused && !missingVenue;

  useEffect(() => {
    // Never allow an active reward on a paused venue.
    if (venuePaused && formData.active) {
      setFormData((prev) => ({ ...prev, active: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venuePaused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (missingVenue) return;

    const submitData = {
      ...formData,
      venue_id: formData.is_global ? (formData.venue_id || null) : formData.venue_id,
      active: canPublish ? formData.active : false,
      max_redemptions: formData.max_redemptions || null
    };
    onSubmit(submitData as unknown as Omit<Reward, 'id'>);
    setOpen(false);
    if (!reward) {
      setFormData({
        name: '',
        points_required: 0,
        valid_until: '',
        active: false,
        description: '',
        venue_id: venueId,
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

          {/* Global toggle first: it decides whether a venue is needed */}
          <div className="flex items-center justify-between rounded-md border border-cgi-muted p-3">
            <div>
              <Label htmlFor="is_global" className="text-cgi-surface-foreground">Globális jutalom</Label>
              <p className="text-xs text-cgi-muted-foreground">Minden helyszínen elérhető, nem kell helyszínt választani</p>
            </div>
            <Switch
              id="is_global"
              checked={formData.is_global}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_global: checked }))}
            />
          </div>

          {/* Venue Selection */}
          {!formData.is_global && (
            <div className="space-y-2">
              <Label htmlFor="venue_id" className="text-cgi-surface-foreground">Helyszín *</Label>
              <Select
                value={formData.venue_id || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, venue_id: value }))}
              >
                <SelectTrigger className="cgi-input">
                  <SelectValue placeholder="Válassz helyszínt" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}{venue.is_paused ? ' (szüneteltetve)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {venuePaused && (
                <p className="text-xs text-red-400">
                  Ez a helyszín szüneteltetve van, ezért a jutalom nem publikálható. Aktiváld először a helyszínt.
                </p>
              )}
            </div>
          )}

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

          {/* Publish toggle */}
          <div className="flex items-center justify-between rounded-md border border-cgi-muted p-3">
            <div>
              <Label htmlFor="active" className="text-cgi-surface-foreground">Aktív (látható az appban)</Label>
              <p className="text-xs text-cgi-muted-foreground">
                {canPublish
                  ? 'Bekapcsolva a jutalom megjelenik a mobilappban.'
                  : 'Publikálás előtt válassz aktív helyszínt.'}
              </p>
            </div>
            <Switch
              id="active"
              checked={formData.active}
              disabled={!canPublish}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cgi-button-secondary">
              Mégse
            </Button>
            <Button type="submit" className="cgi-button-primary" disabled={missingVenue}>
              {reward ? 'Mentés' : 'Létrehozás'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
