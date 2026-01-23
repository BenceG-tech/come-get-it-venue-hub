import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wine, Cake, Coins, Ticket, Pencil, Send, MapPin } from "lucide-react";

interface PendingMilestone {
  id: string;
  user_id: string;
  venue_id: string;
  milestone_type: string;
  milestone_label: string;
  milestone_emoji: string;
  user_name: string;
  venue_name: string;
  visit_count: number;
  suggested_reward: string;
}

interface SendLoyaltyRewardModalProps {
  milestone: PendingMilestone;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type RewardType = "free_drink" | "free_dessert" | "bonus_points" | "discount_coupon" | "custom";

const REWARD_OPTIONS: { value: RewardType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "free_drink", label: "Ingyen ital", icon: Wine, description: "Következő látogatáskor" },
  { value: "free_dessert", label: "Ingyen desszert", icon: Cake, description: "Bármely desszert" },
  { value: "bonus_points", label: "Bónusz pontok", icon: Coins, description: "50 pont alapból" },
  { value: "discount_coupon", label: "Kedvezmény kupon", icon: Ticket, description: "10% kedvezmény" },
  { value: "custom", label: "Egyéni jutalom", icon: Pencil, description: "Saját üzenet" },
];

export function SendLoyaltyRewardModal({
  milestone,
  open,
  onClose,
  onSuccess,
}: SendLoyaltyRewardModalProps) {
  const [selectedReward, setSelectedReward] = useState<RewardType>("bonus_points");
  const [pointsAmount, setPointsAmount] = useState(50);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-loyalty-reward`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            milestone_id: milestone.id,
            reward_type: selectedReward,
            points_amount: selectedReward === "bonus_points" ? pointsAmount : undefined,
            message: message || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send reward");
      }

      toast.success(`Jutalom elküldve: ${milestone.user_name}`, {
        description: `${REWARD_OPTIONS.find((r) => r.value === selectedReward)?.label}`,
      });
      onSuccess();
    } catch (error) {
      toast.error("Hiba történt a jutalom küldése során");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-cgi-surface border-cgi-muted/30 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cgi-surface-foreground flex items-center gap-2">
            <span className="text-2xl">{milestone.milestone_emoji}</span>
            Jutalom küldése
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Milestone Info */}
          <div className="p-4 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30">
            <p className="font-medium text-cgi-surface-foreground">{milestone.user_name}</p>
            <p className="text-sm text-cgi-muted-foreground">
              {milestone.milestone_label} @ {milestone.venue_name}
            </p>
            <p className="text-xs text-cgi-muted-foreground mt-1">
              {milestone.visit_count}. látogatás
            </p>
          </div>

          {/* Reward Selection */}
          <div className="space-y-3">
            <Label className="text-cgi-surface-foreground">Válassz jutalmat</Label>
            <RadioGroup
              value={selectedReward}
              onValueChange={(value) => setSelectedReward(value as RewardType)}
              className="space-y-2"
            >
              {REWARD_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedReward === option.value
                        ? "border-cgi-primary bg-cgi-primary/10"
                        : "border-cgi-muted/30 bg-cgi-muted/10 hover:border-cgi-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <Icon
                      className={`h-5 w-5 ${
                        selectedReward === option.value ? "text-cgi-primary" : "text-cgi-muted-foreground"
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          selectedReward === option.value ? "text-cgi-primary" : "text-cgi-surface-foreground"
                        }`}
                      >
                        {option.label}
                      </p>
                      <p className="text-xs text-cgi-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Points Amount (if bonus_points selected) */}
          {selectedReward === "bonus_points" && (
            <div className="space-y-2">
              <Label className="text-cgi-surface-foreground">Pontok száma</Label>
              <Input
                type="number"
                min={10}
                max={500}
                value={pointsAmount}
                onChange={(e) => setPointsAmount(Number(e.target.value))}
                className="bg-cgi-muted/20 border-cgi-muted/30 text-cgi-surface-foreground"
              />
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label className="text-cgi-surface-foreground">Üzenet (opcionális)</Label>
            <Textarea
              placeholder="Köszönjük a hűségedet! 🎉"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-cgi-muted/20 border-cgi-muted/30 text-cgi-surface-foreground placeholder:text-cgi-muted-foreground"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="cgi-button-secondary">
            Mégse
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="cgi-button-primary">
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Küldés...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Küldés push-ban
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
