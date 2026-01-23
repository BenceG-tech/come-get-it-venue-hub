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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tags, Plus, Loader2, Users, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/auditLogger";

interface UserTagsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  existingTags: string[];
  onSuccess?: () => void;
}

export function UserTagsManager({
  open,
  onOpenChange,
  userIds,
  existingTags,
  onSuccess,
}: UserTagsManagerProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const session = await supabase.auth.getSession();
      const tagsToAdd = Array.from(selectedTags);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://nrxfiblssxwzeziomlvc.supabase.co"}/functions/v1/add-user-tags`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_ids: userIds,
            tags: tagsToAdd,
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
      const tagsAdded = Array.from(selectedTags);
      toast.success(`${data.added_count} tag hozzáadva ${userIds.length} felhasználóhoz`);
      
      // Audit log
      await logAuditEvent({
        action: "bulk_action",
        resourceType: "user",
        metadata: {
          action_type: "add_tags",
          affected_user_ids: userIds,
          affected_count: userIds.length,
          tags: tagsAdded,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["all-user-tags"] });
      setSelectedTags(new Set());
      setNewTag("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleTag = (tag: string) => {
    const next = new Set(selectedTags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    setSelectedTags(next);
  };

  const handleAddNewTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !selectedTags.has(tag)) {
      setSelectedTags(new Set([...selectedTags, tag]));
      setNewTag("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTags.size === 0) {
      toast.error("Válassz legalább egy taget");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-cgi-primary" />
            Tag hozzáadása
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-cgi-muted/30">
            <Users className="h-4 w-4 text-cgi-muted-foreground" />
            <span className="text-sm text-cgi-muted-foreground">
              {userIds.length} felhasználó kiválasztva
            </span>
          </div>

          {/* Selected Tags */}
          {selectedTags.size > 0 && (
            <div className="space-y-2">
              <Label>Kiválasztott tagek</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedTags).map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-cgi-primary/20 text-cgi-primary border-cgi-primary/30 gap-1 cursor-pointer hover:bg-cgi-primary/30"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Existing Tags */}
          {existingTags.length > 0 && (
            <div className="space-y-2">
              <Label>Meglévő tagek</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {existingTags.filter(t => !selectedTags.has(t)).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-cgi-muted/50 transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* New Tag Input */}
          <div className="space-y-2">
            <Label htmlFor="newTag">Új tag</Label>
            <div className="flex gap-2">
              <Input
                id="newTag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="pl. vip, prémium, teszt"
                className="cgi-input flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNewTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
              disabled={mutation.isPending || selectedTags.size === 0}
              className="bg-cgi-primary hover:bg-cgi-primary/90 gap-2"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Hozzáadás ({selectedTags.size} tag)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
