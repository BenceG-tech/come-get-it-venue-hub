import { useMemo, useState } from "react";
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
import { Copy, ExternalLink, RefreshCw, Search, Sparkles, Star } from "lucide-react";
import {
  DRINK_OPTIONS,
  STAGES,
  outreachTexts,
  proposalSlot,
  type PartnerLead,
} from "@/lib/partnerOutreach";

// partner_leads is newer than the generated Database types.
const db = supabase as unknown as SupabaseClient;

const gradeClasses: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  B: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  C: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  D: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

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
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<number | "all">("all");
  const [grade, setGrade] = useState("all");
  const [district, setDistrict] = useState("all");
  const [onlyOffer, setOnlyOffer] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    if (!search) return true;
    return [l.name, l.address, l.instagram_handle, l.venue_type].join(" ").toLowerCase().includes(search.toLowerCase());
  });

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cgi-surface-foreground">Partnerszerzés</h1>
          <p className="text-cgi-muted-foreground mt-1">
            Megkeresendő helyek osztályzattal, személyre szabott ajánlattal és kész szövegekkel
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Frissítés
        </Button>
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
            placeholder="Keresés név, cím vagy Instagram szerint"
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
          <p className="text-sm text-cgi-muted-foreground">{filtered.length} hely</p>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            : filtered.length === 0 ? (
                <Card className="p-8 cgi-card text-center text-cgi-muted-foreground">
                  {leads.length === 0 ? "Még nincs lead. Az átköltöztetés után itt jelennek meg." : "Nincs találat"}
                </Card>
              ) : filtered.map((l) => (
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
                  {l.rating != null && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-cgi-muted-foreground">
                      <Star className="h-3 w-3" /> {l.rating}
                    </span>
                  )}
                  {l.offer_url && <Badge variant="outline" className="hidden sm:inline-flex">Ajánlat kész</Badge>}
                  {l.offer_request && <Badge variant="outline" className="hidden sm:inline-flex">Készül</Badge>}
                  <Badge variant="outline" className={STAGES[l.stage]?.className}>{STAGES[l.stage]?.label}</Badge>
                  {l.grade && <Badge variant="outline" className={gradeClasses[l.grade]}>{l.grade}</Badge>}
                </button>
              ))}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <LeadDetail
              key={selected.id}
              lead={selected}
              saving={save.isPending}
              onSave={(patch) => save.mutate({ id: selected.id, patch })}
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
}: {
  lead: PartnerLead;
  saving: boolean;
  onSave: (patch: Partial<PartnerLead>) => void;
}) {
  const [from, to] = proposalSlot(lead.proposal || {});
  const [drink, setDrink] = useState(lead.offer_request?.drink ?? "");
  const [slotFrom, setSlotFrom] = useState(from);
  const [slotTo, setSlotTo] = useState(to);
  const [cap, setCap] = useState(lead.offer_request?.daily_cap ?? 5);
  const [note, setNote] = useState(lead.note ?? "");
  const p = lead.proposal || {};

  const requestOffer = () => {
    const a = Math.max(6, Math.min(23, slotFrom || 14));
    const b = Math.max(a + 1, Math.min(24, slotTo || a + 2));
    onSave({
      offer_request: {
        requested_at: new Date().toISOString(),
        drink,
        slot: `${a}-${b}`,
        daily_cap: Math.max(1, cap || 5),
      },
    });
    toast.success("Ajánlatkérés rögzítve");
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

      {lead.photo_url && <img src={lead.photo_url} alt="" className="w-full rounded-lg object-cover max-h-56" />}

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
              onClick={() =>
                onSave({ stage: i, stage_log: [...(lead.stage_log || []), { stage: i, at: new Date().toISOString() }] })
              }
            >
              {s.label}
            </Button>
          ))}
        </div>
      </section>

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

      <Card className="cgi-card p-4 grid gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cgi-muted-foreground">
          {lead.offer_url ? "Ajánlat-oldal" : "Személyre szabott ajánlat + videó + képek"}
        </h3>
        {lead.offer_url && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <a href={lead.offer_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Ajánlat-oldal megnyitása
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyText(lead.offer_url!)}>
              <Copy className="h-4 w-4 mr-1" /> Link másolása
            </Button>
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
            Kérve: {new Date(lead.offer_request.requested_at).toLocaleString("hu-HU")}. Az ajánlat-oldal, a Reel és a képek készülnek.
          </p>
        ) : (
          <Button className="justify-self-start" onClick={requestOffer} disabled={saving}>
            <Sparkles className="h-4 w-4 mr-1" />
            {lead.offer_url ? "Újragenerálás" : "Ajánlat + posztcsomag generálása"}
          </Button>
        )}
      </Card>

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

      <section className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-cgi-muted-foreground">Jegyzet</h3>
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (lead.note ?? "") && onSave({ note })}
          placeholder="Kivel beszéltél, mit mondott, mikor hívd vissza…"
        />
      </section>
    </div>
  );
}
