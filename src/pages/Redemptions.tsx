import { useState, useEffect, useCallback } from "react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Eye, Ban, Loader2, Wine } from "lucide-react";
import { RedemptionFilters, RedemptionFiltersState } from "@/components/RedemptionFilters";
import { RedemptionDetailModal, RedemptionRecord } from "@/components/RedemptionDetailModal";
import { VoidRedemptionDialog } from "@/components/VoidRedemptionDialog";
import { RouteGuard } from "@/components/RouteGuard";
import { Json } from "@/integrations/supabase/types";

// Helper to format date/time
const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), "yyyy.MM.dd HH:mm", { locale: hu });
};

// Helper to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper to truncate user ID for privacy
const truncateUserId = (userId: string) => {
  return userId.substring(0, 8) + "...";
};

// Status badge renderer
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "success":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Sikeres</Badge>;
    case "void":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Visszavont</Badge>;
    case "cancelled":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Törölve</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Helper to safely parse metadata from Json type
const parseMetadata = (metadata: Json | null): RedemptionRecord['metadata'] => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  return metadata as RedemptionRecord['metadata'];
};

export default function Redemptions() {
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RedemptionFiltersState>({
    startDate: "",
    endDate: "",
    venueId: "",
    status: "",
  });
  const [selectedRedemption, setSelectedRedemption] = useState<RedemptionRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidRedemptionId, setVoidRedemptionId] = useState<string | null>(null);

  const fetchRedemptions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("redemptions")
        .select(`
          id,
          redeemed_at,
          drink,
          drink_id,
          user_id,
          venue_id,
          value,
          status,
          staff_id,
          token_id,
          metadata,
          venue:venues(id, name),
          drink_details:venue_drinks(drink_name, image_url),
          token_info:redemption_tokens(token_prefix)
        `)
        .order("redeemed_at", { ascending: false })
        .limit(200);

      // Apply filters
      if (filters.startDate) {
        query = query.gte("redeemed_at", filters.startDate);
      }
      if (filters.endDate) {
        // Add one day to include the end date fully
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("redeemed_at", endDate.toISOString().split("T")[0]);
      }
      if (filters.venueId && filters.venueId !== "all") {
        query = query.eq("venue_id", filters.venueId);
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching redemptions:", error);
        return;
      }

      // Transform the data to match our interface
      const transformed: RedemptionRecord[] = (data || []).map((r) => ({
        id: r.id,
        redeemed_at: r.redeemed_at,
        drink: r.drink,
        drink_id: r.drink_id || undefined,
        user_id: r.user_id,
        venue_id: r.venue_id,
        value: r.value,
        status: (r.status || "success") as "success" | "void" | "cancelled",
        staff_id: r.staff_id || undefined,
        token_id: r.token_id || undefined,
        metadata: parseMetadata(r.metadata),
        venue: r.venue as { id: string; name: string } | undefined,
        drink_details: r.drink_details as { drink_name: string; image_url?: string } | undefined,
        token_info: r.token_info as { token_prefix: string } | undefined,
      }));

      setRedemptions(transformed);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  const handleResetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      venueId: "",
      status: "",
    });
  };

  const handleViewDetails = (redemption: RedemptionRecord) => {
    setSelectedRedemption(redemption);
    setDetailModalOpen(true);
  };

  const handleVoidClick = (redemptionId: string) => {
    setVoidRedemptionId(redemptionId);
    setVoidDialogOpen(true);
  };

  const handleVoidSuccess = () => {
    fetchRedemptions();
  };

  const columns = [
    {
      key: "redeemed_at" as keyof RedemptionRecord,
      label: "Dátum",
      render: (value: string) => (
        <span className="text-cgi-surface-foreground">{formatDateTime(value)}</span>
      ),
    },
    {
      key: "venue" as keyof RedemptionRecord,
      label: "Helyszín",
      render: (_: any, item: RedemptionRecord) => (
        <span className="text-cgi-surface-foreground">
          {item.venue?.name || "Ismeretlen"}
        </span>
      ),
    },
    {
      key: "drink" as keyof RedemptionRecord,
      label: "Ital",
      render: (_: any, item: RedemptionRecord) => (
        <div className="flex items-center gap-2">
          <Wine className="h-4 w-4 text-cgi-primary" />
          <span className="text-cgi-surface-foreground">
            {item.drink_details?.drink_name || item.drink}
          </span>
        </div>
      ),
    },
    {
      key: "user_id" as keyof RedemptionRecord,
      label: "Felhasználó",
      render: (value: string) => (
        <code className="text-xs bg-cgi-muted px-2 py-1 rounded text-cgi-secondary">
          {truncateUserId(value)}
        </code>
      ),
    },
    {
      key: "value" as keyof RedemptionRecord,
      label: "Érték",
      render: (value: number) => (
        <span className="font-medium text-cgi-secondary">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "status" as keyof RedemptionRecord,
      label: "Státusz",
      render: (value: string) => <StatusBadge status={value} />,
    },
    {
      key: "id" as keyof RedemptionRecord,
      label: "Műveletek",
      render: (_: any, item: RedemptionRecord) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(item)}
            title="Részletek"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {item.status === "success" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVoidClick(item.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              title="Visszavonás"
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <RouteGuard requiredRoles={["cgi_admin", "venue_owner", "venue_staff"]}>
      <PageLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">
            Beváltások
          </h1>
          <p className="text-cgi-muted-foreground">
            A Come Get It alkalmazáson keresztül beváltott italok listája és audit
          </p>
        </div>

        <RedemptionFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
        />

        <div className="cgi-card">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cgi-primary" />
            </div>
          ) : redemptions.length === 0 ? (
            <div className="text-center py-12 text-cgi-muted-foreground">
              <Wine className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nincs találat a megadott szűrőkkel</p>
            </div>
          ) : (
            <DataTable
              data={redemptions}
              columns={columns}
              searchPlaceholder="Keresés beváltások között..."
            />
          )}
        </div>

        {/* Detail Modal */}
        <RedemptionDetailModal
          redemption={selectedRedemption}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />

        {/* Void Confirmation Dialog */}
        <VoidRedemptionDialog
          redemptionId={voidRedemptionId}
          open={voidDialogOpen}
          onOpenChange={setVoidDialogOpen}
          onSuccess={handleVoidSuccess}
        />
      </PageLayout>
    </RouteGuard>
  );
}
