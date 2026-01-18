import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoidRedemptionDialogProps {
  redemptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function VoidRedemptionDialog({
  redemptionId,
  open,
  onOpenChange,
  onSuccess,
}: VoidRedemptionDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVoid = async () => {
    if (!redemptionId || !reason.trim()) {
      toast.error("Kérlek add meg a visszavonás okát");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Nincs bejelentkezve");
        return;
      }

      const response = await supabase.functions.invoke("void-redemption", {
        body: {
          redemption_id: redemptionId,
          reason: reason.trim(),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Hiba történt");
      }

      const data = response.data;
      if (!data.success) {
        throw new Error(data.error || "Hiba történt");
      }

      toast.success("Beváltás sikeresen visszavonva");
      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Void error:", error);
      toast.error(error.message || "Nem sikerült visszavonni a beváltást");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Beváltás visszavonása
          </AlertDialogTitle>
          <AlertDialogDescription>
            Biztosan vissza szeretnéd vonni ezt a beváltást? Ez a művelet nem vonható vissza.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="reason" className="text-cgi-muted-foreground">
            Visszavonás oka *
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Pl.: Vendég távozott az ital átvétele előtt..."
            className="mt-2"
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Mégse</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleVoid}
            disabled={loading || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Visszavonás...
              </>
            ) : (
              "Visszavonás"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
