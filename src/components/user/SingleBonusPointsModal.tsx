import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Gift, Send, Loader2, User, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/auditLogger";

interface SingleBonusPointsModalProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SingleBonusPointsModal({
  userId,
  userName,
  open,
  onOpenChange,
}: SingleBonusPointsModalProps) {
  const [points, setPoints] = useState<number>(100);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/bulk-send-bonus`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_ids: [userId],
            points,
            reason,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Hiba történt");
      }

      return response.json();
    },
    onSuccess: async () => {
      toast.success(`${points} pont jóváírva: ${userName}`);
      
      // Audit log
      await logAuditEvent({
        action: "send_bonus",
        resourceType: "user",
        resourceId: userId,
        metadata: {
          action_type: "single_bonus",
          points,
          reason,
          user_name: userName,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-quick-view", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-stats-extended", userId] });
      setPoints(100);
      setReason("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (points <= 0) {
      toast.error("A pont összeg pozitív szám kell legyen");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-cgi-secondary" />
            Bónusz pont küldése
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-cgi-muted/30">
            <User className="h-4 w-4 text-cgi-muted-foreground" />
            <span className="text-sm text-cgi-surface-foreground font-medium">
              {userName}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Pont összeg</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cgi-muted-foreground" />
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                placeholder="100"
                min={1}
                max={10000}
                className="cgi-input pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Indoklás (opcionális)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="pl. Hűségprogram jutalom, Esemény részvétel, stb."
              maxLength={200}
              rows={2}
              className="cgi-input resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || points <= 0}
              className="bg-cgi-secondary hover:bg-cgi-secondary/90 gap-2"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Jóváírás ({points} pont)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
