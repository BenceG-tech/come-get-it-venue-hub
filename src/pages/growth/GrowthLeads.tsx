import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Mail, Phone, Globe, Instagram, Search, Copy, ExternalLink, Sparkles, MapPin, Star } from "lucide-react";
import { gdb, GrowthLead, GrowthOffer, LEAD_STATUSES, OFFER_STATUSES, offerShareUrl, outreachTemplates } from "@/lib/growth";
import { RequestOfferDialog, RequestTarget } from "@/components/growth/RequestOfferDialog";

const gradeClass: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  B: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  C: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

const ALL = "__all";

function igUrl(ig: string) {
  if (ig.startsWith("http")) return ig;
  return `https://instagram.com/${ig.replace(/^@/, "")}`;
}
function webUrl(w: string) {
  return w.startsWith("http") ? w : `https://${w}`;
}

async function copy(text: string, msg = "Vágólapra másolva") {
  await navigator.clipboard.writeText(text);
  toast.success(msg);
}

export default function GrowthLeads() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [district, setDistrict] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [hasOffer, setHasOffer] = useState(ALL);
  const [selected, setSelected] = useState<GrowthLead | null>(null);
  const [target, setTarget] = useState<RequestTarget | null>(null);

  const leadsQ = useQuery({
    queryKey: ["growth_leads"],
    queryFn: async () => {
      const all: GrowthLead[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await gdb.from("growth_leads").select("*").order("score", { ascending: false, nullsFirst: false }).range(from, from + 999);
        if (error) throw error;
        all.push(...data);
        if (data.length < 1000) break;
      }
      return all;
    },
  });
  const offersQ = useQuery({
    queryKey: ["growth_offers"],
    queryFn: async () => {
      const { data, error } = await gdb.from("growth_offers").select("*").order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      return data as GrowthOffer[];
    },
  });
  const pendingQ = useQuery({
    queryKey: ["growth_pending"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await gdb.from("growth_offer_requests").select("id", { count: "exact", head: true }).in("status", ["varakozik", "folyamatban"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const leads = leadsQ.data ?? [];
  const offers = offersQ.data ?? [];
  const offersByLead = useMemo(() => {
    const m = new Map<string, GrowthOffer[]>();
    offers.forEach((o) => { if (o.lead_id) m.set(o.lead_id, [...(m.get(o.lead_id) ?? []), o]); });
    return m;
  }, [offers]);

  const districts = useMemo(() => [...new Set(leads.map((l) => l.district).filter(Boolean) as string[])].sort(), [leads]);
  const types = useMemo(() => [...new Set(leads.map((l) => l.venue_type).filter(Boolean) as string[])].sort(), [leads]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (s && !`${l.name} ${l.address ?? ""} ${l.email ?? ""}`.toLowerCase().includes(s)) return false;
      if (grade !== ALL && l.grade !== grade) return false;
      if (status !== ALL && String(l.status) !== status) return false;
      if (district !== ALL && l.district !== district) return false;
      if (type !== ALL && l.venue_type !== type) return false;
      const ho = offersByLead.has(l.id);
      if (hasOffer === "yes" && !ho) return false;
      if (hasOffer === "no" && ho) return false;
      return true;
    });
  }, [leads, q, grade, status, district, type, hasOffer, offersByLead]);

  const updateLead = async (id: string, patch: Partial<GrowthLead>) => {
    const { error } = await gdb.from("growth_leads").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    qc.invalidateQueries({ queryKey: ["growth_leads"] });
    return true;
  };

  const stats = [
    { label: "Összes lead", value: leads.length },
    { label: "A-kategória", value: leads.filter((l) => l.grade === "A").length },
    { label: "Ajánlatok", value: offers.length },
    { label: "Kiküldve", value: offers.filter((o) => o.status === "kikuldve").length },
    { label: "Függő kérések", value: pendingQ.data ?? 0 },
  ];

  const openRequest = (l: GrowthLead) => setTarget({ leadId: l.id, venueName: l.name, idosav: l.data?.javaslat?.idosav });

  return (
    <PageLayout>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-cgi-surface-foreground">Partnerszerzés</h1>
        {(pendingQ.data ?? 0) > 0 && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40">{pendingQ.data} függő generálás</Badge>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="cgi-card p-4">
            <div className="text-xs text-cgi-muted-foreground">{s.label}</div>
            <div className="text-2xl font-semibold text-cyan-300">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-cgi-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés név, cím, email…" className="pl-8" />
        </div>
        <FilterSelect value={grade} onChange={setGrade} placeholder="Kategória" options={["A", "B", "C"].map((g) => [g, g])} />
        <FilterSelect value={status} onChange={setStatus} placeholder="Státusz" options={LEAD_STATUSES.map((l, i) => [String(i), l])} />
        <FilterSelect value={district} onChange={setDistrict} placeholder="Kerület" options={districts.map((d) => [d, d])} />
        <FilterSelect value={type} onChange={setType} placeholder="Típus" options={types.map((d) => [d, d])} />
        <FilterSelect value={hasOffer} onChange={setHasOffer} placeholder="Van ajánlat" options={[["yes", "Van ajánlat"], ["no", "Nincs ajánlat"]]} />
      </div>

      <Card className="cgi-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Név</TableHead>
              <TableHead>Értékelés</TableHead>
              <TableHead>Pont</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Elérhetőség</TableHead>
              <TableHead>Ajánlat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsQ.isLoading && <TableRow><TableCell colSpan={7} className="text-center text-cgi-muted-foreground">Betöltés…</TableCell></TableRow>}
            {!leadsQ.isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-cgi-muted-foreground">Nincs találat</TableCell></TableRow>}
            {filtered.slice(0, 500).map((l) => {
              const lo = offersByLead.get(l.id);
              return (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                  <TableCell>{l.grade && <Badge variant="outline" className={gradeClass[l.grade] ?? ""}>{l.grade}</Badge>}</TableCell>
                  <TableCell>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-cgi-muted-foreground">{[l.venue_type, l.district].filter(Boolean).join(" · ")}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{l.rating != null ? <>★ {l.rating} <span className="text-cgi-muted-foreground">({l.review_count ?? 0})</span></> : "—"}</TableCell>
                  <TableCell>{l.score ?? "—"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={String(l.status ?? 0)} onValueChange={(v) => updateLead(l.id, { status: Number(v) }).then((ok) => ok && toast.success("Státusz frissítve"))}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{LEAD_STATUSES.map((s, i) => <SelectItem key={i} value={String(i)}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}><ContactIcons l={l} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {lo ? (
                      <Button size="sm" variant="outline" className="cgi-button-secondary" onClick={() => window.open(`/a/${lo[0].token}`, "_blank")}><ExternalLink className="h-4 w-4 mr-1" />Megnyitás</Button>
                    ) : (
                      <Button size="sm" variant="outline" className="cgi-button-secondary whitespace-nowrap" onClick={() => openRequest(l)}><Sparkles className="h-4 w-4 mr-1" />Ajánlat generálása</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length > 500 && <p className="p-3 text-xs text-cgi-muted-foreground">Az első 500 találat látható ({filtered.length} összesen) – szűkíts a szűrőkkel.</p>}
      </Card>

      <LeadSheet lead={selected} offers={selected ? offersByLead.get(selected.id) ?? [] : []} onClose={() => setSelected(null)} onRequest={openRequest} onSaveNote={(l, note) => updateLead(l.id, { data: { ...(l.data ?? {}), jegyzet: note } })} />
      <RequestOfferDialog target={target} onClose={() => setTarget(null)} onDone={() => qc.invalidateQueries({ queryKey: ["growth_pending"] })} />
    </PageLayout>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}: mind</SelectItem>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ContactIcons({ l }: { l: GrowthLead }) {
  const cls = "p-1 rounded hover:bg-cgi-muted/50 text-cgi-primary";
  return (
    <div className="flex gap-1">
      {l.email && <a className={cls} href={`mailto:${l.email}`} title={l.email}><Mail className="h-4 w-4" /></a>}
      {l.phone && <a className={cls} href={`tel:${l.phone}`} title={l.phone}><Phone className="h-4 w-4" /></a>}
      {l.website && <a className={cls} href={webUrl(l.website)} target="_blank" rel="noreferrer" title={l.website}><Globe className="h-4 w-4" /></a>}
      {l.instagram && <a className={cls} href={igUrl(l.instagram)} target="_blank" rel="noreferrer" title={l.instagram}><Instagram className="h-4 w-4" /></a>}
    </div>
  );
}

function LeadSheet({ lead, offers, onClose, onRequest, onSaveNote }: {
  lead: GrowthLead | null; offers: GrowthOffer[]; onClose: () => void;
  onRequest: (l: GrowthLead) => void; onSaveNote: (l: GrowthLead, note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");
  useEffect(() => setNote(lead?.data?.jegyzet ?? ""), [lead]);
  if (!lead) return <Sheet open={false} />;
  const d = lead.data ?? {};
  const j = d.javaslat ?? {};
  const maps = d.placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name)}&query_place_id=${encodeURIComponent(d.placeId)}`
    : null;
  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-cgi-surface border-cgi-muted text-cgi-surface-foreground">
        <SheetHeader>
          <SheetTitle className="text-cgi-surface-foreground flex items-center gap-2">
            {lead.grade && <Badge variant="outline" className={gradeClass[lead.grade] ?? ""}>{lead.grade}</Badge>}
            {lead.name}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-4 text-sm">
          {lead.photo_url && <img src={lead.photo_url} alt={lead.name} className="w-full h-48 object-cover rounded-lg" />}
          <Section title="Elérhetőség">
            <Row k="Típus" v={lead.venue_type} />
            <Row k="Kerület" v={lead.district} />
            <Row k="Cím" v={lead.address} />
            <Row k="Email" v={lead.email} />
            <Row k="Telefon" v={lead.phone} />
            <Row k="Weboldal" v={lead.website} />
            <Row k="Instagram" v={lead.instagram} />
            <Row k="Facebook" v={d.fb} />
            <Row k="Értékelés" v={lead.rating != null ? `★ ${lead.rating} (${lead.review_count ?? 0})` : null} />
            <Row k="Pont" v={lead.score != null ? String(lead.score) : null} />
            <div className="flex gap-2 pt-1"><ContactIcons l={lead} />{maps && <a href={maps} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cgi-primary hover:underline"><MapPin className="h-4 w-4" />Google Maps</a>}</div>
          </Section>
          <Section title="Javaslat">
            <Row k="Tétel" v={j.tetel} /><Row k="B-tétel" v={j.b_tetel} /><Row k="Idősáv" v={j.idosav} />
            <Row k="Szcenárió" v={j.szcenario} /><Row k="Teszt" v={j.teszt} /><Row k="Miért" v={j.miert} />
          </Section>
          {d.csendes && <Section title="Csendes időszak"><Row k="Mettől" v={d.csendes.tol} /><Row k="Meddig" v={d.csendes.ig} /><Row k="Forgalom" v={d.csendes.forgalom} /><Row k="Csúcs" v={d.csendes.csucs} /></Section>}
          {d.nyitva && <Section title="Nyitvatartás"><p className="whitespace-pre-line text-cgi-muted-foreground">{d.nyitva}</p></Section>}
          {d.italok && d.italok.length > 0 && <Section title="Italok"><div className="flex flex-wrap gap-1">{d.italok.map((i) => <Badge key={i} variant="outline">{i}</Badge>)}</div></Section>}
          {d.bemutatkozas && <Section title="Bemutatkozás"><p className="text-cgi-muted-foreground">{d.bemutatkozas}</p></Section>}
          <Section title="Jegyzet">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            <Button size="sm" className="mt-2" onClick={() => onSaveNote(lead, note).then((ok) => ok && toast.success("Jegyzet mentve"))}>Mentés</Button>
          </Section>
          <Section title="Megkeresési sablonok">
            {outreachTemplates(lead).map((t) => (
              <div key={t.label} className="rounded-lg border border-cgi-muted p-3 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{t.label}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(t.text)}><Copy className="h-4 w-4 mr-1" />Másolás</Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-cgi-muted-foreground font-sans">{t.text}</pre>
              </div>
            ))}
          </Section>
          <Section title="Ajánlatok">
            {offers.length === 0 && <p className="text-cgi-muted-foreground">Még nincs ajánlat.</p>}
            {offers.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 border-b border-cgi-muted py-2">
                <div>
                  <div className="font-medium">{o.headline || o.venue_name}</div>
                  <div className="text-xs text-cgi-muted-foreground">{OFFER_STATUSES[o.status] ?? o.status}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copy(offerShareUrl(o.token), "Link másolva")}><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => window.open(`/a/${o.token}`, "_blank")}><ExternalLink className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" className="mt-2 cgi-button-secondary" onClick={() => onRequest(lead)}><Sparkles className="h-4 w-4 mr-1" />Ajánlat generálása</Button>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-xs uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1">{title === "Értékelés" && <Star className="h-3 w-3" />}{title}</h3>{children}</div>;
}
function Row({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return <div className="flex gap-2 py-0.5"><span className="text-cgi-muted-foreground w-24 shrink-0">{k}</span><span className="break-words min-w-0">{v}</span></div>;
}
