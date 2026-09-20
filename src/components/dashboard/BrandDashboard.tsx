import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Target, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export function BrandDashboard() {
  const { data: stats, isLoading } = useDashboardStats('brand');

  const totalPartnerVenues = stats?.total_partner_venues ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cgi-surface-foreground">Brand Dashboard</h1>
        <p className="text-cgi-muted-foreground mt-2">
          Márkapartnerségek áttekintése
          {isLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
        </p>
      </div>

      {/* Only measured figures are shown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Aktív partner helyszínek"
          value={isLoading ? "..." : totalPartnerVenues.toString()}
          icon={Target}
          tooltip="A nem szüneteltetett helyszínek száma a platformon."
        />
      </div>

      <ChartCard title="Kampány teljesítmény">
        <div className="h-48 flex flex-col items-center justify-center text-center text-cgi-muted-foreground px-6">
          <p className="font-medium text-cgi-surface-foreground">Még nincs kampány-adatgyűjtés</p>
          <p className="text-sm mt-1">
            A márka kampányok elérési és konverziós mutatói akkor jelennek meg, amikor a kampánykövetés élesedik.
          </p>
        </div>
      </ChartCard>
    </div>
  );
}
