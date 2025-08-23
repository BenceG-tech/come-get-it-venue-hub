
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit } from "lucide-react";
import { Reward } from "@/lib/types";

interface RewardFormModalProps {
  reward?: Reward;
  onSubmit: (reward: Omit<Reward, 'id'>) => void;
  trigger?: React.ReactNode;
}

export function RewardFormModal({ reward, onSubmit, trigger }: RewardFormModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: reward?.name || '',
    points_required: reward?.points_required || 0,
    valid_until: reward?.valid_until || '',
    active: reward?.active ?? true,
    description: reward?.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setOpen(false);
    if (!reward) {
      setFormData({
        name: '',
        points_required: 0,
        valid_until: '',
        active: true,
        description: ''
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
      <DialogContent className="sm:max-w-[425px] bg-cgi-surface border-cgi-muted">
        <DialogHeader>
          <DialogTitle className="text-cgi-surface-foreground">
            {reward ? 'Jutalom szerkesztése' : 'Új jutalom létrehozása'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-cgi-surface-foreground">Jutalom neve</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="cgi-input"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="points" className="text-cgi-surface-foreground">Szükséges pontok</Label>
            <Input
              id="points"
              type="number"
              value={formData.points_required}
              onChange={(e) => setFormData(prev => ({ ...prev, points_required: parseInt(e.target.value) }))}
              className="cgi-input"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="valid_until" className="text-cgi-surface-foreground">Érvényesség vége</Label>
            <Input
              id="valid_until"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              className="cgi-input"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-cgi-surface-foreground">Leírás</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="cgi-input resize-none"
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active" className="text-cgi-surface-foreground">Aktív</Label>
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
