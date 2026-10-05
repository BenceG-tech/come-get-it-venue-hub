import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Copy, ExternalLink, Search, ArrowLeft, RefreshCw, Check } from "lucide-react";
import { gdb, GrowthOffer, OFFER_STATUSES, offerPublicFileUrl, offerShareUrl } from "@/lib/growth";

type Row = GrowthOffer & { partner_leads?: { id: string; name: string } | null };

export default function GrowthOffers() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const search = params.get("q") || "";
  const status = params.get("status") || "all";
  const setFilter = (key: string, value: string) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (!value || value === "all") next.delete(key); else next.set(key, value);
      return next;
    }, { replace: true });
  };
  const { data = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["growth_offers_joined"],
    queryFn: async () => {
      const { data, error } = await gdb.from("growth_offers").select("*, partner_leads(id, name)").order("created_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data as Row[];
    },
  });

  const updateStatus = async (offer: Row, nextStatus: string) => {
    if (savingIds.has(offer.id) || offer.status === nextStatus) return;
    setSavingIds((previous) => new Set(previous).add(offer.id));
    try {
      const patch: { status: string; sent_at?: string } = { status: nextStatus };
      if (nextStatus === "kikuldve" && !offer.sent_at) patch.sent_at = new Date().toISOString();
      const { error } = await gdb.from("growth_offers").update(patch).eq("id", offer.id);
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["growth_offers_joined"] }),
        qc.invalidateQueries({ queryKey: ["growth_offers"] }),
      ]);
      toast.success("Az ajánlat státusza frissült");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nem sikerült menteni a státuszt");
    } finally {
      setSavingIds((previous) => { const next = new Set(previous); next.delete(offer.id); return next; });
    }
  };

  const copyLink = async (offer: Row) => {
    try {
      await navigator.clipboard.writeText(offerShareUrl(offer.token));
      toast.success("Link másolva. A küldést a Kiküldtem gombbal rögzítheted.");
    } catch {
      toast.error("Nem sikerült másolni. Nyisd meg az ajánlatot, és másold ki a címsorból.");
    }
  };

  const normalizedSearch = search.trim().toLocaleLowerCase("hu");
  const filtered = data.filter((offer) => (status === "all" || offer.status === status)
    && [offer.venue_name, offer.partner_leads?.name, offer.headline, offer.drink].filter(Boolean).join(" ").toLocaleLowerCase("hu").includes(normalizedSearch));

  return (
    <PageLayout>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/partner-leads" className="mb-2 inline-flex items-center gap-1 text-xs text-cgi-muted-foreground hover:text-cgi-primary"><ArrowLeft className="h-3 w-3" />Leadek</Link>
          <h1 className="text-2xl font-semibold text-cgi-surface-foreground">Ajánlatok</h1>
          <p className="mt-1 text-sm text-cgi-muted-foreground">Előnézet, megosztás és visszajelzések egy helyen.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Frissítés</Button>
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-cgi-muted-foreground" /><Input aria-label="Keresés az ajánlatok között" placeholder="Helyszín, ajánlat vagy ital keresése…" value={search} onChange={(event) => setFilter("q", event.target.value)} className="pl-9" /></div>
        <Select value={status} onValueChange={(value) => setFilter("status", value)}><SelectTrigger className="sm:w-48" aria-label="Ajánlat státusza"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Minden státusz</SelectItem>{Object.entries(OFFER_STATUSES).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
      </div>
      {error ? <Card className="p-6"><p>Az ajánlatokat nem sikerült betölteni.</p><Button className="mt-3" variant="outline" onClick={() => refetch()}>Újrapróbálás</Button></Card> : <>
      <p className="mb-3 text-xs text-cgi-muted-foreground" aria-live="polite">{isLoading ? "Ajánlatok betöltése…" : `${filtered.length} ajánlat${data.length >= 2000 ? " · a legutóbbi 2000 közül" : ""}`}</p>
      {!isLoading && filtered.length === 0 && <Card className="p-8 text-center text-cgi-muted-foreground">{data.length === 0 ? "Még nincs kész ajánlat. A partner adatlapjáról rögzíthetsz ajánlatkérést." : "Nincs a szűrőknek megfelelő ajánlat."}{data.length > 0 && <Button variant="link" onClick={() => setParams({})}>Szűrők törlése</Button>}</Card>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((offer) => (
          <Card key={offer.id} className="cgi-card overflow-hidden flex flex-col">
            <img src={offerPublicFileUrl(`${offer.token}/media/post.jpg`)} alt={`${offer.venue_name} ajánlatának előnézete`} loading="lazy" className="h-36 w-full object-cover bg-cgi-muted/30" onError={(event) => {
              const img = event.currentTarget;
              if (!img.dataset.fallback) { img.dataset.fallback = "1"; img.src = offerPublicFileUrl(`${offer.token}/media/photo.jpg`); }
              else img.style.display = "none";
            }} />
            <div className="p-4 flex-1 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2"><h2 className="font-semibold text-cgi-surface-foreground">{offer.venue_name}</h2><Badge variant="outline">{OFFER_STATUSES[offer.status] || offer.status}</Badge></div>
              {offer.headline && <p className="text-sm text-cgi-surface-foreground/90">{offer.headline}</p>}
              <p className="text-xs text-cgi-muted-foreground">{[offer.drink, offer.time_window, offer.daily_cap ? `napi ${offer.daily_cap} db` : null].filter(Boolean).join(" · ") || "A részletek az ajánlatoldalon találhatók."}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-auto border-t border-cgi-muted/40 pt-3">
                <Select value={offer.status} disabled={savingIds.has(offer.id)} onValueChange={(value) => updateStatus(offer, value)}><SelectTrigger className="h-9 w-40" aria-label={`${offer.venue_name} ajánlatának státusza`}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(OFFER_STATUSES).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
                <span className="text-xs text-cgi-muted-foreground">{format(new Date(offer.created_at), "yyyy.MM.dd")}</span>
              </div>
              <div className="flex gap-2"><Button asChild size="sm" variant="outline" className="flex-1"><a href={`/a/${offer.token}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Előnézet</a></Button><Button size="sm" className="flex-1" onClick={() => copyLink(offer)}><Copy className="h-4 w-4 mr-1" />Link másolása</Button></div>
              {offer.status === "kesz" && <Button size="sm" variant="outline" disabled={savingIds.has(offer.id)} onClick={() => updateStatus(offer, "kikuldve")}><Check className="mr-1 h-4 w-4" />Kiküldtem – státusz rögzítése</Button>}
              {offer.sent_at && <p className="text-xs text-cgi-muted-foreground">Rögzített küldés: {format(new Date(offer.sent_at), "yyyy.MM.dd HH:mm")}</p>}
              {offer.partner_leads?.id && <Link to={`/partner-leads?lead=${encodeURIComponent(offer.partner_leads.id)}`} className="text-xs text-cgi-primary hover:underline">Partner adatlapja →</Link>}
            </div>
          </Card>
        ))}
      </div>
      </>}
    </PageLayout>
  );
}
