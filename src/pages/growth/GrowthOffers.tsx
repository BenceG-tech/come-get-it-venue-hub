import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Copy, ExternalLink } from "lucide-react";
import { gdb, GrowthOffer, OFFER_STATUSES, offerPublicFileUrl, offerShareUrl } from "@/lib/growth";

type Row = GrowthOffer & { growth_leads?: { name: string } | null };

export default function GrowthOffers() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["growth_offers_joined"],
    queryFn: async () => {
      const { data, error } = await gdb.from("growth_offers").select("*, growth_leads(name)").order("created_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data as Row[];
    },
  });

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await gdb.from("growth_offers").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    qc.invalidateQueries({ queryKey: ["growth_offers_joined"] });
    qc.invalidateQueries({ queryKey: ["growth_offers"] });
    return true;
  };

  const copyLink = async (o: Row) => {
    await navigator.clipboard.writeText(offerShareUrl(o.token));
    if (o.status === "kesz") {
      await update(o.id, { status: "kikuldve", sent_at: new Date().toISOString() });
      toast.success("Link másolva – státusz: Kiküldve");
    } else toast.success("Link másolva");
  };

  return (
    <PageLayout>
      <h1 className="text-2xl font-semibold text-cgi-surface-foreground mb-6">Ajánlatok</h1>
      {isLoading && <p className="text-cgi-muted-foreground">Betöltés…</p>}
      {!isLoading && data.length === 0 && <p className="text-cgi-muted-foreground">Még nincs ajánlat.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((o) => (
          <Card key={o.id} className="cgi-card overflow-hidden flex flex-col">
            <img
              src={offerPublicFileUrl(`${o.token}/media/post.jpg`)}
              alt={o.venue_name}
              className="h-44 w-full object-cover bg-cgi-muted/30"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fb) { img.dataset.fb = "1"; img.src = offerPublicFileUrl(`${o.token}/media/photo.jpg`); }
                else img.style.visibility = "hidden";
              }}
            />
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div>
                <div className="font-semibold text-cgi-surface-foreground">{o.venue_name}</div>
                {o.growth_leads?.name && o.growth_leads.name !== o.venue_name && <div className="text-xs text-cgi-muted-foreground">{o.growth_leads.name}</div>}
              </div>
              {o.headline && <p className="text-sm text-cgi-surface-foreground/90">{o.headline}</p>}
              <p className="text-xs text-cgi-muted-foreground">{[o.drink, o.time_window, o.daily_cap ? `napi ${o.daily_cap} db` : null].filter(Boolean).join(" · ")}</p>
              <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                <Select value={o.status} onValueChange={(v) => update(o.id, { status: v }).then((ok) => ok && toast.success("Státusz frissítve"))}>
                  <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(OFFER_STATUSES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-xs text-cgi-muted-foreground">{format(new Date(o.created_at), "yyyy.MM.dd")}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 cgi-button-secondary" onClick={() => window.open(`/a/${o.token}`, "_blank")}><ExternalLink className="h-4 w-4 mr-1" />Megnyitás</Button>
                <Button size="sm" className="flex-1" onClick={() => copyLink(o)}><Copy className="h-4 w-4 mr-1" />Link másolása</Button>
              </div>
              {o.legacy_artifact_url && <a href={o.legacy_artifact_url} target="_blank" rel="noreferrer" className="text-[11px] text-cgi-muted-foreground truncate hover:underline">Régi link: {o.legacy_artifact_url}</a>}
            </div>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
