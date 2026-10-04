import { lazy, Suspense, useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ExternalLink, List, Map as MapIcon, RefreshCw, Search, Sparkles, Star, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DRINK_OPTIONS,
  STAGES,
  outreachTexts,
  proposalSlot,
  type PartnerLead,
} from "@/lib/partnerOutreach";

// partner_leads is newer than the generated Database types.
const db = supabase as unknown as SupabaseClient;
const PartnerLeadMap = lazy(() =>
  import("@/components/PartnerLeadMap").then((module) => ({ default: module.PartnerLeadMap }))
);

const gradeClasses: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  B: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  C: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  D: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

function nextStep(lead: PartnerLead) {
  if (lead.stage === 6) return "Partnerkapcsolat gondozása";
  if (lead.stage === 7) return "Új megkeresés később";
  if (lead.stage === 5) return "Egyeztetett hívás lebonyolítása";
  if (lead.stage === 4) return "Válasz és következő lépés egyeztetése";
  if (lead.stage === 2 || lead.stage === 3) return "Visszajelzés követése";
  return lead.offer_url ? "Ajánlat ellenőrzése és megosztása" : "Megkeresés előkészítése";
}

function needsFollowUp(lead: PartnerLead) {
  if (lead.stage !== 2 && lead.stage !== 3) return false;
  const lastChange = lead.stage_log?.slice(-1)[0]?.at;
  return Boolean(lastChange && Date.now() - new Date(lastChange).getTime() >= 3 * 86400000);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Kimásolva");
  } catch {
    toast.error("Nem sikerült a vágólapra másolni");
  }
}

export default function PartnerLeads() {
  const queryClient = useQueryClient();
  const [hasUnsavedNote, setHasUnsavedNote] = useState(false);
  const [params, setParams] = useSearchParams();
  const setFilter = (key: string, value: string) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    if (!value || value === "all") next.delete(key); else next.set(key, value);
    if (!["lead", "view", "page"].includes(key)) next.delete("page");
    return next;
  }, { replace: true });
  const search = params.get("q") || "";
  const rawStage = params.get("stage");
  const stage: number | "all" = rawStage !== null && /^\d$/.test(rawStage) && Number(rawStage) < STAGES.length ? Number(rawStage) : "all";
  const grade = params.get("grade") || "all";
  const district = params.get("district") || "all";
  const onlyOffer = params.get("offer") === "yes";
  const selectedId = params.get("lead");
  const view = params.get("view") === "map" ? "map" : "list";
  const workFilter = params.get("work") || "all";
  const sort = params.get("sort") || "score";
  const setSearch = (value: string) => setFilter("q", value);
  const setStage = (value: number | "all") => setFilter("stage", String(value));
  const setGrade = (value: string) => setFilter("grade", value);
  const setDistrict = (value: string) => setFilter("district", value);
  const setOnlyOffer = (value: boolean) => setFilter("offer", value ? "yes" : "");
  const setSelectedId = (value: string | null) => setFilter("lead", value || "");
  const setView = (value: string) => setFilter("view", value === "list" ? "" : value);

  const { data: leads = [], isLoading, error, refetch, isFetching } = useQuery<PartnerLead[]>({
    queryKey: ["partner-leads"],
    queryFn: async () => {
      const { data, error } = await db
        .from("partner_leads")
        .select("*")
        .order("score", { ascending: false, nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      return data as PartnerLead[];
    },
  });

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PartnerLead> }) => {
      const { error } = await db
        .from("partner_leads")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner-leads"] }),
    onError: (err: Error) => toast.error(`Nem sikerült menteni: ${err.message}`),
  });

  const districts = useMemo(
    () => [...new Set(leads.map((l) => l.district).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "hu")),
    [leads]
  );

  const filtered = leads.filter((l) => {
    if (stage !== "all" && l.stage !== stage) return false;
    if (grade !== "all" && l.grade !== grade) return false;
    if (district !== "all" && l.district !== district) return false;
    if (onlyOffer && !l.offer_url) return false;
    if (workFilter === "followup" && !needsFollowUp(l)) return false;
    if (workFilter === "reply" && l.stage !== 4) return false;
    if (workFilter === "prepare" && l.stage > 1) return false;
    if (!search) return true;
    return [l.name, l.address, l.instagram_handle, l.venue_type, l.email, l.phone].join(" ").toLowerCase().includes(search.toLowerCase());
  });

  filtered.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "hu")
    : sort === "recent" ? (new Date(b.updated_at).getTime() || 0) - (new Date(a.updated_at).getTime() || 0)
    : (b.score || 0) - (a.score || 0));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 50));
  const page = Math.min(pageCount - 1, Math.max(0, Number.parseInt(params.get("page") || "0", 10) || 0));
  const visibleLeads = filtered.slice(page * 50, (page + 1) * 50);
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cgi-surface-foreground">Értékesítés</h1>
          <p className="text-cgi-muted-foreground mt-1">
            Partnerjelöltek, kész ajánlatok és a következő lépés egy helyen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/applicants">Jelentkezők</Link></Button>
        <Button asChild variant="outline"><Link to="/growth/offers">Ajánlatok</Link></Button>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Frissítés
        </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Értékesítési munkalisták">
        {[
          ["all", "Minden partner", leads.length],
          ["prepare", "Előkészítés", leads.filter((lead) => lead.stage < 2).length],
          ["reply", "Válasz érkezett", leads.filter((lead) => lead.stage === 4).length],
          ["followup", "3+ napja várunk", leads.filter(needsFollowUp).length],
        ].map(([key, label, count]) => <Button key={key} size="sm" variant={workFilter === key ? "default" : "outline"} onClick={() => setFilter("work", String(key))} aria-pressed={workFilter === key}>{label}<span className="ml-2 tabular-nums">{isLoading ? "…" : count}</span></Button>)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        {STAGES.map((s, i) => {
          const count = leads.filter((l) => l.stage === i).length;
          const active = stage === i;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setStage(active ? "all" : i)}
              className={`cgi-card rounded-lg border p-2 text-left transition-colors ${active ? s.className : "border-transparent"}`}
            >
              <div className={`text-xs font-semibold ${s.className.split(" ")[0]}`}>{s.label}</div>
              <div className="text-xl font-bold text-cgi-surface-foreground tabular-nums">{count}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cgi-muted-foreground" />
          <Input
            aria-label="Partner keresése"
            placeholder="Név, cím, e-mail vagy Instagram…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="lg:w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Minden osztályzat</SelectItem>
            {["A", "B", "C", "D"].map((g) => <SelectItem key={g} value={g}>{g} osztály</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="lg:w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Minden kerület</SelectItem>
            {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={onlyOffer ? "default" : "outline"} onClick={() => setOnlyOffer(!onlyOffer)}>
          Van ajánlat-oldal
        </Button>
      </div>

      {error ? (
        <Card className="p-6 cgi-card">
          <p className="text-cgi-surface-foreground font-medium">Nem sikerült betölteni a leadeket.</p>
          <p className="text-cgi-muted-foreground text-sm mt-2">{(error as Error).message}</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><p className="text-sm text-cgi-muted-foreground">{isLoading ? "Betöltés…" : `${filtered.length} partner${leads.length >= 2000 ? " · legfeljebb 2000 betöltött partner közül" : ""}`}</p>
            {(search || stage !== "all" || grade !== "all" || district !== "all" || onlyOffer || workFilter !== "all") && <Button size="sm" variant="ghost" onClick={() => setParams(view === "map" ? { view: "map" } : {})}>Szűrők törlése</Button>}</div>
            <div className="flex flex-wrap gap-2">
            <Select value={sort} onValueChange={(value) => setFilter("sort", value)}><SelectTrigger className="w-40 h-10" aria-label="Partnerlista rendezése"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="score">Pontszám szerint</SelectItem><SelectItem value="name">Név szerint</SelectItem><SelectItem value="recent">Frissítés szerint</SelectItem></SelectContent></Select>
            <div className="flex rounded-lg border border-cgi-muted bg-cgi-surface p-1">
              <Button
                type="button"
                size="sm"
                variant={view === "map" ? "secondary" : "ghost"}
                onClick={() => setView("map")}
                className="h-8"
              >
                <MapIcon className="mr-1.5 h-4 w-4" /> Térkép
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "list" ? "secondary" : "ghost"}
                onClick={() => setView("list")}
                className="h-8"
              >
                <List className="mr-1.5 h-4 w-4" /> Lista
              </Button>
            </div>
            </div>
          </div>

          {isLoading ? (
            view === "map" ? (
              <Skeleton className="h-[620px] w-full rounded-lg" />
            ) : (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            )
          ) : filtered.length === 0 ? (
            <Card className="p-8 cgi-card text-center text-cgi-muted-foreground">
              {leads.length === 0 ? "Még nincs lead. Az átköltöztetés után itt jelennek meg." : "Nincs találat"}
            </Card>
          ) : view === "map" ? (
            <Suspense fallback={<Skeleton className="h-[620px] w-full rounded-lg" />}>
              <PartnerLeadMap
                leads={filtered}
                totalFiltered={filtered.length}
                onSelect={setSelectedId}
              />
            </Suspense>
          ) : (
            visibleLeads.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedId(l.id)}
                className="cgi-card rounded-lg border border-transparent hover:border-cgi-primary/40 p-3 flex items-center gap-3 text-left"
              >
                {l.photo_url ? (
                  <img src={l.photo_url} alt="" className="h-12 w-12 rounded-md object-cover flex-none" loading="lazy" />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-cgi-muted flex-none" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-cgi-surface-foreground truncate">{l.name}</div>
                  <div className="text-xs text-cgi-muted-foreground truncate">
                    {[l.venue_type, l.district, l.proposal?.tetel, l.proposal?.idosav].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="hidden xl:block w-52 shrink-0 text-xs text-cgi-muted-foreground"><span className="block text-cgi-surface-foreground">{nextStep(l)}</span>{needsFollowUp(l) && <span className="text-amber-300">Legalább 3 napja ebben a státuszban</span>}</div>
                {l.rating != null && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-cgi-muted-foreground">
                    <Star className="h-3 w-3" /> {l.rating}
                  </span>
                )}
                {l.offer_url && <Badge variant="outline" className="hidden sm:inline-flex">Ajánlat kész</Badge>}
                {l.offer_request && <Badge variant="outline" className="hidden sm:inline-flex">Kérés rögzítve</Badge>}
                <Badge variant="outline" className={STAGES[l.stage]?.className}>{STAGES[l.stage]?.label}</Badge>
                {l.grade && <Badge variant="outline" className={gradeClasses[l.grade]}>{l.grade}</Badge>}
              </button>
            ))
          )}
          {!isLoading && view === "list" && pageCount > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cgi-muted/40 pt-4 mt-2"><p className="text-xs text-cgi-muted-foreground">{page * 50 + 1}–{Math.min((page + 1) * 50, filtered.length)} / {filtered.length} partner</p><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setFilter("page", String(page - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Előző</Button><span className="text-xs tabular-nums">{page + 1} / {pageCount}</span><Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setFilter("page", String(page + 1))}>Következő<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => {
        if (open || save.isPending) return;
        if (hasUnsavedNote && !window.confirm('A jegyzet módosításai nincsenek mentve. Bezárod az adatlapot?')) return;
        setSelectedId(null);
        setHasUnsavedNote(false);
      }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <LeadDetail
              key={selected.id}
              lead={selected}
              saving={save.isPending}
              onDirtyChange={setHasUnsavedNote}
              onSave={(patch) => save.mutate({ id: selected.id, patch })}
              onSaveAsync={(patch) => save.mutateAsync({ id: selected.id, patch })}
            />
          )}
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
}

function LeadDetail({
  lead,
  saving,
  onSave,
  onSaveAsync,
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
  lead: PartnerLead;
  saving: boolean;
  onSave: (patch: Partial<PartnerLead>) => void;
  onSaveAsync: (patch: Partial<PartnerLead>) => Promise<void>;
}) {
  const [from, to] = proposalSlot(lead.proposal || {});
  const [drink, setDrink] = useState(lead.offer_request?.drink ?? "");
  const [slotFrom, setSlotFrom] = useState(from);
  const [slotTo, setSlotTo] = useState(to);
  const [cap, setCap] = useState(lead.offer_request?.daily_cap ?? 5);
  const [note, setNote] = useState(lead.note ?? "");
  const p = lead.proposal || {};
  const [detailTab, setDetailTab] = useState("overview");
  useEffect(() => { onDirtyChange(note !== (lead.note ?? "")); }, [note, lead.note, onDirtyChange]);
  const saveNote = async () => {
    try { await onSaveAsync({ note }); toast.success("Jegyzet mentve"); } catch { /* shared mutation handles error */ }
  };

  const requestOffer = async () => {
    const a = Math.max(6, Math.min(23, slotFrom || 14));
    const b = Math.max(a + 1, Math.min(24, slotTo || a + 2));
    try {
      await onSaveAsync({
        offer_request: {
          requested_at: new Date().toISOString(),
          drink,
          slot: `${a}-${b}`,
          daily_cap: Math.max(1, cap || 5),
        },
      });
      toast.success("Ajánlatkérés rögzítve");
    } catch {
      // The mutation's shared onError handler displays the actionable error.
    }
  };

  const contacts: [string, string | null, string | null][] = [
    ["Weboldal", lead.website, lead.website],
    ["Instagram", lead.instagram_handle ? "@" + lead.instagram_handle : lead.instagram, lead.instagram],
    ["Facebook", lead.facebook ? "Facebook-oldal" : null, lead.facebook],
    ["E-mail", lead.email, lead.email ? "mailto:" + lead.email : null],
    ["Telefon", lead.phone, lead.phone ? "tel:" + lead.phone : null],
    ["Térkép", lead.gmaps_url ? "Google Térkép" : null, lead.gmaps_url],
  ];

  return (
    <div className="grid gap-5">
      <SheetHeader>
        <SheetTitle className="text-left">{lead.name}</SheetTitle>
        <p className="text-sm text-cgi-muted-foreground text-left">
          {[lead.description, lead.address].filter(Boolean).join(" · ")}
        </p>
      </SheetHeader>

      <Card className="border-cgi-primary/30 bg-cgi-primary/5 p-4">
        <p className="text-xs text-cgi-muted-foreground">Következő lépés · a jelenlegi státusz alapján</p>
        <p className="mt-1 font-medium">{nextStep(lead)}</p>
        {needsFollowUp(lead) && <p className="mt-1 text-xs text-amber-300">A rögzített státusz legalább 3 napja nem változott.</p>}
      </Card>

      <section className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cgi-muted-foreground">Hol tartunk</h3>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s, i) => (
            <Button
              key={s.label}
              size="sm"
              variant="outline"
              disabled={saving}
              className={lead.stage === i ? s.className + " bg-white/5" : "text-cgi-muted-foreground"}
              onClick={() => {
                if (lead.stage !== i) onSave({ stage: i, stage_log: [...(lead.stage_log || []), { stage: i, at: new Date().toISOString() }] });
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </section>

      <Tabs value={detailTab} onValueChange={setDetailTab}>
      <TabsList className="w-full grid grid-cols-3 sticky top-0 z-10"><TabsTrigger value="overview">Partner</TabsTrigger><TabsTrigger value="offer">Ajánlat</TabsTrigger><TabsTrigger value="outreach">Megkeresés</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-5 pt-2">
      <section className="grid gap-1 text-sm">
        {contacts.filter(([, label]) => label).map(([key, label, href]) => (
          <div key={key} className="flex gap-3">
            <span className="w-24 flex-none text-cgi-muted-foreground">{key}</span>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer" className="truncate hover:underline">{label}</a>
            ) : (
              <span>{label}</span>
            )}
          </div>
        ))}
        {lead.opening_hours && (
          <div className="flex gap-3">
            <span className="w-24 flex-none text-cgi-muted-foreground">Nyitva</span>
            <span className="text-xs">{lead.opening_hours}</span>
          </div>
        )}
      </section>

      <Card className="cgi-card p-4 grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cgi-muted-foreground">Javasolt pilot-ajánlat</h3>
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-cgi-muted-foreground">Szcenárió</dt><dd>{p.szcenario || "A · Csendes óra"}</dd>
          <dt className="text-cgi-muted-foreground">Tétel</dt><dd>{p.tetel || "–"}{p.b_tetel ? ` (B: ${p.b_tetel})` : ""}</dd>
          <dt className="text-cgi-muted-foreground">Idősáv</dt><dd>{p.idosav || "–"}</dd>
          <dt className="text-cgi-muted-foreground">Keret</dt><dd>{p.keret || "napi 5 db"}</dd>
          {p.miert && (<><dt className="text-cgi-muted-foreground">Miért</dt><dd>{p.miert}</dd></>)}
        </dl>
      </Card>

      <section className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cgi-muted-foreground">Belső jegyzet és következő teendő</h3>
        <Textarea aria-label="Partner belső jegyzete" rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kapcsolattartó, egyeztetés, visszahívás időpontja…" />
        <Button size="sm" className="justify-self-end" disabled={saving || note === (lead.note ?? "")} onClick={saveNote}>{saving ? "Mentés…" : "Jegyzet mentése"}</Button>
      </section>
      {(lead.stage_log || []).length > 0 && <section className="space-y-2"><h3 className="text-xs font-semibold uppercase text-cgi-muted-foreground">Státuszelőzmények</h3>{[...(lead.stage_log || [])].reverse().slice(0, 8).map((entry, index) => <div key={`${entry.at}-${index}`} className="flex justify-between gap-2 text-xs"><span>{STAGES[entry.stage]?.label || "Ismeretlen státusz"}</span><time className="text-cgi-muted-foreground">{new Date(entry.at).toLocaleString("hu-HU")}</time></div>)}</section>}
      </TabsContent>
      <TabsContent value="offer" className="space-y-4 pt-2">
      <Card className="cgi-card p-4 grid gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cgi-muted-foreground">
          {lead.offer_url ? "Ajánlat-oldal" : "Személyre szabott ajánlat + videó + képek"}
        </h3>
        {lead.offer_url && (
          <div className="flex flex-wrap items-center gap-2">
            {lead.offer_url.startsWith(`${window.location.origin}/a/`) ? (
              <>
                <Button asChild size="sm">
                  <a href={lead.offer_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Ajánlat-oldal megnyitása
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyText(lead.offer_url!)}>
                  <Copy className="h-4 w-4 mr-1" /> Link másolása
                </Button>
              </>
            ) : /claude\.ai|artifact/i.test(lead.offer_url) ? (
              <a href={lead.offer_url} target="_blank" rel="noreferrer" className="text-xs text-cgi-muted-foreground hover:underline inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Régi link
              </a>
            ) : (
              <>
                <Button asChild size="sm">
                  <a href={lead.offer_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Ajánlat-oldal megnyitása
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyText(lead.offer_url!)}>
                  <Copy className="h-4 w-4 mr-1" /> Link másolása
                </Button>
              </>
            )}
            {lead.offer_info && <span className="text-xs text-cgi-muted-foreground">{lead.offer_info}</span>}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="grid gap-1 text-xs text-cgi-muted-foreground col-span-2">
            Ital
            <Select value={drink || "auto"} onValueChange={(v) => setDrink(v === "auto" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DRINK_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "auto"} value={o.value || "auto"}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-xs text-cgi-muted-foreground">
            Tól (óra)
            <Input type="number" min={6} max={23} value={slotFrom} onChange={(e) => setSlotFrom(Number(e.target.value))} />
          </label>
          <label className="grid gap-1 text-xs text-cgi-muted-foreground">
            Ig (óra)
            <Input type="number" min={7} max={24} value={slotTo} onChange={(e) => setSlotTo(Number(e.target.value))} />
          </label>
          <label className="grid gap-1 text-xs text-cgi-muted-foreground">
            Napi keret
            <Input type="number" min={1} max={50} value={cap} onChange={(e) => setCap(Number(e.target.value))} />
          </label>
        </div>
        {lead.offer_request ? (
          <p className="text-sm text-amber-300">
            Kérve: {new Date(lead.offer_request.requested_at).toLocaleString("hu-HU")}. Az igény rögzítve. Az elkészült anyagok az ajánlat linkjén jelennek meg.
          </p>
        ) : (
          <Button className="justify-self-start" onClick={requestOffer} disabled={saving}>
            <Sparkles className="h-4 w-4 mr-1" />
            {lead.offer_url ? "Új ajánlatkérés rögzítése" : "Ajánlatkérés rögzítése"}
          </Button>
        )}
      </Card>

      </TabsContent>
      <TabsContent value="outreach" className="space-y-4 pt-2">
      <p className="text-xs text-cgi-muted-foreground">Ellenőrizd a szöveget, majd másold a választott csatornába. A küldés után frissítsd a státuszt.</p>
      <section className="grid gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cgi-muted-foreground">Megkeresés · kész szövegek</h3>
        {outreachTexts(lead).map(([title, body]) => (
          <Card key={title} className="cgi-card p-3 grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{title}</span>
              <Button size="sm" variant="outline" onClick={() => copyText(body)}>
                <Copy className="h-4 w-4 mr-1" /> Másolás
              </Button>
            </div>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-cgi-muted-foreground">{body}</pre>
          </Card>
        ))}
      </section>

      </TabsContent>
      </Tabs>
    </div>
  );
}
