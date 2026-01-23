import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ManualNotificationModalProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  defaultBody?: string;
}

export function ManualNotificationModal({
  userId,
  userName,
  open,
  onOpenChange,
  defaultTitle = "",
  defaultBody = "",
}: ManualNotificationModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-user-notification", {
        body: { user_id: userId, title, body },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Értesítés elküldve", {
        description: `${userName} sikeresen értesítve lett.`,
      });
      queryClient.invalidateQueries({ queryKey: ["user-stats-extended", userId] });
      setTitle("");
      setBody("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Hiba történt", {
        description: error.message || "Az értesítés küldése sikertelen.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Minden mező kitöltése kötelező");
      return;
    }
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cgi-surface-foreground">
            Értesítés küldése
          </DialogTitle>
          <DialogDescription>
            Push értesítés küldése a felhasználónak: <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Cím</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Értesítés címe..."
              maxLength={100}
            />
            <p className="text-xs text-cgi-muted-foreground text-right">
              {title.length}/100
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="body">Üzenet</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Értesítés tartalma..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-cgi-muted-foreground text-right">
              {body.length}/500
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendMutation.isPending}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              className="cgi-button-primary"
              disabled={sendMutation.isPending || !title.trim() || !body.trim()}
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Küldés...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Küldés
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
