import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { hu } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CHANNELS, CONTENT_KINDS, CONTENT_STATUSES, gdb, GrowthContent } from "@/lib/growth";

const ALL = "__all";

function isVideo(p?: string | null) { return !!p && /\.(mp4|webm|mov)$/i.test(p); }

function useSignedUrls(paths: string[]) {
  const key = paths.join("|");
  return useQuery({
    queryKey: ["marketing_signed", key],
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("marketing").createSignedUrls(paths, 3600);
      if (error) throw error;
      const m: Record<string, string> = {};
      data.forEach((d) => { if (d.path && d.signedUrl) m[d.path] = d.signedUrl; });
      return m;
    },
  });
}

function Preview({ item, urls, className }: { item: GrowthContent; urls: Record<string, string>; className: string }) {
  const p = item.thumb_path || item.storage_path;
  const u = p ? urls[p] : undefined;
  if (!u) return <div className={`${className} bg-cgi-muted/30 flex items-center justify-center text-xs text-cgi-muted-foreground`}>{CONTENT_KINDS[item.kind] ?? item.kind}</div>;
  return isVideo(p) ? <video src={u} className={`${className} object-cover`} muted playsInline controls /> : <img src={u} alt={item.title} className={`${className} object-cover`} />;
}

export default function GrowthContentPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [channel, setChannel] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [editing, setEditing] = useState<Partial<GrowthContent> | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["growth_content"],
    queryFn: async () => {
      const { data, error } = await gdb.from("growth_content").select("*").order("planned_at", { ascending: true, nullsFirst: false }).limit(2000);
      if (error) throw error;
      return data as GrowthContent[];
    },
  });

  const items = useMemo(() => data.filter((c) => (channel === ALL || c.channel === channel) && (status === ALL || c.status === status)), [data, channel, status]);
  const paths = useMemo(() => [...new Set(items.flatMap((i) => [i.thumb_path, i.storage_path]).filter(Boolean) as string[])], [items]);
  const { data: urls = {} } = useSignedUrls(paths);

  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });

  return (
    <PageLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-cgi-surface-foreground">Tartalom</h1>
        <Button onClick={() => setEditing({ kind: "kep", status: "terv", channel: "Instagram" })}><Plus className="h-4 w-4 mr-1" />Új tartalom</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList><TabsTrigger value="calendar">Naptár</TabsTrigger><TabsTrigger value="list">Lista</TabsTrigger></TabsList>
        </Tabs>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Minden csatorna</SelectItem>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Minden státusz</SelectItem>{Object.entries(CONTENT_STATUSES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {view === "calendar" ? (
        <Card className="cgi-card p-3">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-medium capitalize text-cgi-surface-foreground">{format(month, "yyyy. LLLL", { locale: hu })}</span>
            <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {["H", "K", "Sze", "Cs", "P", "Szo", "V"].map((d) => <div key={d} className="text-center text-cgi-muted-foreground py-1">{d}</div>)}
            {days.map((day) => {
              const dayItems = items.filter((i) => i.planned_at && isSameDay(new Date(i.planned_at), day));
              return (
                <div key={day.toISOString()}
                  className={`min-h-[90px] rounded-md border border-cgi-muted/60 p-1 cursor-pointer hover:bg-cgi-muted/20 ${isSameMonth(day, month) ? "" : "opacity-40"}`}
                  onClick={() => setEditing({ kind: "kep", status: "terv", channel: "Instagram", planned_at: new Date(day.setHours(18, 0, 0, 0)).toISOString() })}>
                  <div className="text-cgi-muted-foreground">{format(day, "d")}</div>
                  {dayItems.map((i) => (
                    <div key={i.id} onClick={(e) => { e.stopPropagation(); setEditing(i); }}
                      className="mt-1 truncate rounded bg-cyan-500/20 text-cyan-200 px-1 py-0.5" title={i.title}>
                      {i.planned_at && format(new Date(i.planned_at), "HH:mm")} {i.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.length === 0 && <p className="text-cgi-muted-foreground">Nincs tartalom.</p>}
          {items.map((i) => (
            <Card key={i.id} className="cgi-card overflow-hidden cursor-pointer" onClick={() => setEditing(i)}>
              <Preview item={i} urls={urls} className="h-40 w-full" />
              <div className="p-3 space-y-1">
                <div className="font-medium text-cgi-surface-foreground">{i.title}</div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{CONTENT_KINDS[i.kind] ?? i.kind}</Badge>
                  {i.channel && <Badge variant="outline">{i.channel}</Badge>}
                  <Badge variant="outline" className="text-cyan-300 border-cyan-500/40">{CONTENT_STATUSES[i.status] ?? i.status}</Badge>
                </div>
                <div className="text-xs text-cgi-muted-foreground">{i.planned_at ? format(new Date(i.planned_at), "yyyy.MM.dd HH:mm") : "Nincs időpont"}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ContentDialog item={editing} urls={urls} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["growth_content"] })} />
    </PageLayout>
  );
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

function ContentDialog({ item, urls, onClose, onSaved }: { item: Partial<GrowthContent> | null; urls: Record<string, string>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<GrowthContent>>({});
  const [when, setWhen] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(item ?? {}); setWhen(toLocalInput(item?.planned_at)); setFile(null); }, [item]);

  const save = async () => {
    if (!f.title?.trim()) { toast.error("Adj meg címet"); return; }
    setBusy(true);
    try {
      const id = f.id ?? crypto.randomUUID();
      let storage_path = f.storage_path ?? null;
      if (file) {
        storage_path = `content/${id}/${file.name.replace(/[^\w.-]+/g, "_")}`;
        const { error } = await supabase.storage.from("marketing").upload(storage_path, file, { upsert: true, contentType: file.type || undefined });
        if (error) throw error;
      }
      const row = {
        id, title: f.title.trim(), kind: f.kind ?? "kep", channel: f.channel ?? null, status: f.status ?? "terv",
        caption: f.caption ?? null, planned_at: when ? new Date(when).toISOString() : null, storage_path,
      };
      const { error } = f.id
        ? await gdb.from("growth_content").update(row).eq("id", id)
        : await gdb.from("growth_content").insert({ ...row, data: {} });
      if (error) throw error;
      toast.success("Mentve");
      onSaved(); onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hiba történt");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!f.id || !confirm("Biztosan törlöd?")) return;
    const { error } = await gdb.from("growth_content").delete().eq("id", f.id);
    if (error) toast.error(error.message); else { toast.success("Törölve"); onSaved(); onClose(); }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-cgi-surface border-cgi-muted text-cgi-surface-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Tartalom szerkesztése" : "Új tartalom"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Cím</Label><Input value={f.title ?? ""} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Típus</Label>
              <Select value={f.kind ?? "kep"} onValueChange={(v) => setF({ ...f, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CONTENT_KINDS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Csatorna</Label>
              <Select value={f.channel ?? "Instagram"} onValueChange={(v) => setF({ ...f, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Időpont</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Státusz</Label>
              <Select value={f.status ?? "terv"} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CONTENT_STATUSES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Caption</Label><Textarea rows={4} value={f.caption ?? ""} onChange={(e) => setF({ ...f, caption: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Fájl</Label>
            {f.id && f.storage_path && !file && <Preview item={f as GrowthContent} urls={urls} className="h-40 w-full rounded-md" />}
            <Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {f.id && <Button variant="ghost" className="text-red-400 mr-auto" onClick={remove}><Trash2 className="h-4 w-4 mr-1" />Törlés</Button>}
          <Button variant="ghost" onClick={onClose}>Mégse</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Mentés…" : "Mentés"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
