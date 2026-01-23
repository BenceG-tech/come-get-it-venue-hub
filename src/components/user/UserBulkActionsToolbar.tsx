import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Tags,
  Bell,
  Gift,
  X,
  ChevronDown,
  Plus,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BulkNotificationModal } from "./BulkNotificationModal";
import { BulkBonusPointsModal } from "./BulkBonusPointsModal";
import { UserTagsManager } from "./UserTagsManager";
import { exportUsersToCSV, type UserExportData } from "@/lib/exportUtils";

interface UserBulkActionsToolbarProps {
  selectedUserIds: Set<string>;
  selectedUsers: UserExportData[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function UserBulkActionsToolbar({
  selectedUserIds,
  selectedUsers,
  onClearSelection,
  onRefresh,
}: UserBulkActionsToolbarProps) {
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);

  // Fetch existing tags for dropdown
  const { data: allTags } = useQuery({
    queryKey: ["all-user-tags"],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://nrxfiblssxwzeziomlvc.supabase.co"}/functions/v1/get-all-tags`,
        {
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.tags as string[];
    },
    staleTime: 30000,
  });

  const handleExportSelected = () => {
    exportUsersToCSV(selectedUsers);
  };

  const handleSuccess = () => {
    onRefresh();
  };

  const count = selectedUserIds.size;

  if (count === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg bg-cgi-primary/10 border border-cgi-primary/30 animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-3">
          <Badge className="bg-cgi-primary text-white">
            {count} felhasználó kiválasztva
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSelected}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          {/* Tags Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Tags className="h-4 w-4" />
                <span className="hidden sm:inline">Tag</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {allTags?.slice(0, 5).map((tag) => (
                <DropdownMenuItem
                  key={tag}
                  onClick={() => setShowTagsModal(true)}
                >
                  <Tags className="h-4 w-4 mr-2 text-cgi-muted-foreground" />
                  {tag}
                </DropdownMenuItem>
              ))}
              {allTags && allTags.length > 5 && (
                <DropdownMenuItem onClick={() => setShowTagsModal(true)}>
                  <Plus className="h-4 w-4 mr-2 text-cgi-muted-foreground" />
                  Több tag...
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowTagsModal(true)}>
                <Plus className="h-4 w-4 mr-2 text-cgi-primary" />
                <span className="text-cgi-primary">Új tag hozzáadása</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Push Notification */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotificationModal(true)}
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Push</span>
          </Button>

          {/* Bonus Points */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBonusModal(true)}
            className="gap-2"
          >
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Bónusz</span>
          </Button>

          {/* Clear Selection */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      <BulkNotificationModal
        open={showNotificationModal}
        onOpenChange={setShowNotificationModal}
        userIds={Array.from(selectedUserIds)}
        onSuccess={handleSuccess}
      />

      <BulkBonusPointsModal
        open={showBonusModal}
        onOpenChange={setShowBonusModal}
        userIds={Array.from(selectedUserIds)}
        onSuccess={handleSuccess}
      />

      <UserTagsManager
        open={showTagsModal}
        onOpenChange={setShowTagsModal}
        userIds={Array.from(selectedUserIds)}
        existingTags={allTags || []}
        onSuccess={handleSuccess}
      />
    </>
  );
}
