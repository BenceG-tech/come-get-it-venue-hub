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
import { Bell, Send, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/auditLogger";

interface BulkNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  onSuccess?: () => void;
}

export function BulkNotificationModal({
  open,
  onOpenChange,
  userIds,
  onSuccess,
}: BulkNotificationModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://nrxfiblssxwzeziomlvc.supabase.co"}/functions/v1/bulk-send-notification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_ids: userIds,
            title,
            body,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Hiba történt");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      toast.success(`${data.sent_count} felhasználónak elküldve`);
      
      // Audit log
      await logAuditEvent({
        action: "bulk_action",
        resourceType: "notification",
        metadata: {
          action_type: "bulk_notification",
          affected_user_ids: userIds,
          affected_count: userIds.length,
          title,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["users"] });
      setTitle("");
      setBody("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Cím és üzenet kötelező");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-cgi-primary" />
            Push értesítés küldése
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-cgi-muted/30">
            <Users className="h-4 w-4 text-cgi-muted-foreground" />
            <span className="text-sm text-cgi-muted-foreground">
              {userIds.length} felhasználó kiválasztva
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Értesítés címe</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="pl. Különleges ajánlat!"
              maxLength={60}
              className="cgi-input"
            />
            <p className="text-xs text-cgi-muted-foreground text-right">
              {title.length}/60
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Üzenet</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Írd meg az üzenetet..."
              maxLength={200}
              rows={3}
              className="cgi-input resize-none"
            />
            <p className="text-xs text-cgi-muted-foreground text-right">
              {body.length}/200
            </p>
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
              disabled={mutation.isPending || !title.trim() || !body.trim()}
              className="bg-cgi-primary hover:bg-cgi-primary/90 gap-2"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Küldés {userIds.length} felhasználónak
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
