import { useState, useEffect, useCallback } from "react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Eye, Ban, Loader2, Wine, Download } from "lucide-react";
import { RedemptionFilters, RedemptionFiltersState } from "@/components/RedemptionFilters";
import { RedemptionDetailModal, RedemptionRecord } from "@/components/RedemptionDetailModal";
import { VoidRedemptionDialog } from "@/components/VoidRedemptionDialog";
import { RouteGuard } from "@/components/RouteGuard";
import { Json } from "@/integrations/supabase/types";
import { UserLink, VenueLink, DrinkLink } from "@/components/ui/entity-links";
import { RedemptionContextBadges } from "@/components/RedemptionContextBadges";
import { MobileTooltip, InfoTooltip } from "@/components/ui/mobile-tooltip";
import { ExportDropdown } from "@/components/ExportDropdown";
import { exportRedemptionsToCSV } from "@/lib/exportUtils";

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

// Status badge renderer
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusContent = () => {
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

  const getStatusTooltip = () => {
    switch (status) {
      case "success":
        return "A beváltás sikeresen megtörtént";
      case "void":
        return "A beváltás visszavonásra került (pl. hiba, rossz ital)";
      case "cancelled":
        return "A beváltás törölve lett a feldolgozás előtt";
      default:
        return status;
    }
  };

  return (
    <MobileTooltip content={getStatusTooltip()}>
      {getStatusContent()}
    </MobileTooltip>
  );
};

// Helper to safely parse metadata from Json type
const parseMetadata = (metadata: Json | null): RedemptionRecord['metadata'] => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  return metadata as RedemptionRecord['metadata'];
};

// Extended type with user profile info
interface ExtendedRedemptionRecord extends RedemptionRecord {
  user_profile?: { id: string; name: string | null; avatar_url: string | null };
  visits_total?: number;
  visits_this_week?: number;
  visits_this_month?: number;
}

export default function Redemptions() {
  const [redemptions, setRedemptions] = useState<ExtendedRedemptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RedemptionFiltersState>({
    startDate: "",
    endDate: "",
    venueId: "",
    status: "",
  });
  const [selectedRedemption, setSelectedRedemption] = useState<ExtendedRedemptionRecord | null>(null);
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
      const transformed: ExtendedRedemptionRecord[] = (data || []).map((r) => ({
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

      // Fetch visit counts for each user/venue combination
      const userVenuePairs = [...new Set(transformed.map(r => `${r.user_id}:${r.venue_id}`))];
      
      // Simple aggregation - count total visits per user/venue
      const visitCounts = new Map<string, { total: number; week: number; month: number }>();
      
      for (const r of transformed) {
        const key = `${r.user_id}:${r.venue_id}`;
        if (!visitCounts.has(key)) {
          visitCounts.set(key, { total: 0, week: 0, month: 0 });
        }
        const counts = visitCounts.get(key)!;
        counts.total++;
        
        const redeemDate = new Date(r.redeemed_at);
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        if (redeemDate >= weekAgo) counts.week++;
        if (redeemDate >= monthAgo) counts.month++;
      }

      // Attach visit counts to redemptions
      const enriched = transformed.map(r => {
        const key = `${r.user_id}:${r.venue_id}`;
        const counts = visitCounts.get(key);
        return {
          ...r,
          visits_total: counts?.total || 1,
          visits_this_week: counts?.week || 1,
          visits_this_month: counts?.month || 1,
        };
      });

      setRedemptions(enriched);
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

  const handleViewDetails = (redemption: ExtendedRedemptionRecord) => {
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
      key: "redeemed_at" as keyof ExtendedRedemptionRecord,
      label: "Dátum",
      tooltip: "A beváltás időpontja magyar időzóna szerint",
      render: (value: string) => (
        <span className="text-cgi-surface-foreground whitespace-nowrap">{formatDateTime(value)}</span>
      ),
    },
    {
      key: "user_profile" as keyof ExtendedRedemptionRecord,
      label: "Felhasználó",
      tooltip: "A beváltó felhasználó - kattints a profiljához",
      render: (_: any, item: ExtendedRedemptionRecord) => (
        <UserLink
          userId={item.user_id}
          userName={item.user_profile?.name || "Vendég"}
          avatarUrl={item.user_profile?.avatar_url || undefined}
          showAvatar={true}
          size="sm"
        />
      ),
    },
    {
      key: "venue" as keyof ExtendedRedemptionRecord,
      label: "Helyszín",
      tooltip: "A beváltás helyszíne - kattints a helyszín oldalához",
      render: (_: any, item: ExtendedRedemptionRecord) => (
        <VenueLink
          venueId={item.venue_id}
          venueName={item.venue?.name || "Ismeretlen"}
          size="sm"
        />
      ),
    },
    {
      key: "drink" as keyof ExtendedRedemptionRecord,
      label: "Ital",
      tooltip: "A beváltott ital neve",
      render: (_: any, item: ExtendedRedemptionRecord) => (
        <DrinkLink
          drinkId={item.drink_id}
          drinkName={item.drink_details?.drink_name || item.drink}
          size="sm"
        />
      ),
    },
    {
      key: "visits_total" as keyof ExtendedRedemptionRecord,
      label: "Kontextus",
      tooltip: "Látogatási kontextus: hányadik látogatás ezen a helyszínen",
      render: (_: any, item: ExtendedRedemptionRecord) => (
        <RedemptionContextBadges
          visitsThisWeek={item.visits_this_week}
          visitsThisMonth={item.visits_this_month}
          visitsTotal={item.visits_total}
          showMilestones={true}
          size="sm"
        />
      ),
    },
    {
      key: "value" as keyof ExtendedRedemptionRecord,
      label: "Érték",
      tooltip: "Az ingyenes ital számított értéke forintban",
      render: (value: number) => (
        <span className="font-medium text-cgi-secondary whitespace-nowrap">{formatCurrency(value)}</span>
      ),
    },
    {
      key: "status" as keyof ExtendedRedemptionRecord,
      label: "Státusz",
      tooltip: "A beváltás jelenlegi állapota",
      render: (value: string) => <StatusBadge status={value} />,
    },
    {
      key: "id" as keyof ExtendedRedemptionRecord,
      label: "Műveletek",
      tooltip: "Elérhető műveletek a beváltáson",
      render: (_: any, item: ExtendedRedemptionRecord) => (
        <div className="flex items-center gap-2">
          <MobileTooltip content="Részletek megtekintése">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(item)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </MobileTooltip>
          {item.status === "success" && (
            <MobileTooltip content="Beváltás visszavonása (void)">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVoidClick(item.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Ban className="h-4 w-4" />
              </Button>
            </MobileTooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <RouteGuard requiredRoles={["cgi_admin", "venue_owner", "venue_staff"]}>
      <PageLayout>
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">
                  Beváltások
                </h1>
                <InfoTooltip 
                  content="Itt láthatod az összes free drink beváltást. Kattints a felhasználó nevére a profiljához, vagy a helyszínre a helyszín oldalához."
                  iconClassName="h-5 w-5 mb-2"
                />
              </div>
              <p className="text-cgi-muted-foreground">
                A Come Get It alkalmazáson keresztül beváltott italok listája és audit
              </p>
            </div>
            
            {/* Export Button */}
            {redemptions.length > 0 && (
              <ExportDropdown
                options={[
                  {
                    label: "Összes beváltás (CSV)",
                    onClick: () => exportRedemptionsToCSV(
                      redemptions.map(r => ({
                        id: r.id,
                        user_name: r.user_profile?.name || undefined,
                        user_id: r.user_id,
                        venue_name: r.venue?.name || "Ismeretlen",
                        drink_name: r.drink_details?.drink_name || r.drink,
                        value: r.value,
                        status: r.status,
                        redeemed_at: r.redeemed_at
                      }))
                    )
                  }
                ]}
                tooltipContent="Beváltások exportálása CSV fájlba"
              />
            )}
          </div>
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
