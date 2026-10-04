import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Sparkles, RefreshCw } from "lucide-react";
import { gdb, GrowthSignup, SIGNUP_STATUSES } from "@/lib/growth";
import { RequestOfferDialog, RequestTarget } from "@/components/growth/RequestOfferDialog";

function NoteCell({ row, onSaved }: { row: GrowthSignup; onSaved: () => void }) {
  const [v, setV] = useState(row.note ?? "");
  const save = async () => {
    if ((row.note ?? "") === v) return;
    const { error } = await gdb.from("growth_signups").update({ note: v }).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Megjegyzés mentve"); onSaved(); }
  };
  return <Input value={v} onChange={(e) => setV(e.target.value)} onBlur={save} className="h-8 min-w-[160px]" placeholder="—" />;
}

export default function GrowthSignups() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"venue_application" | "waitlist">("venue_application");
  const [dedupe, setDedupe] = useState(true);
  const [target, setTarget] = useState<RequestTarget | null>(null);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["growth_signups"],
    queryFn: async () => {
      const { data, error } = await gdb.from("growth_signups").select("*").order("submitted_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data as GrowthSignup[];
    },
  });

  const rows = useMemo(() => {
    const list = data.filter((r) => r.kind === kind);
    if (!dedupe) return list;
    const seen = new Set<string>();
    return list.filter((r) => {
      if (!r.email) return true;
      const k = `${r.email.toLowerCase()}|${r.kind}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [data, kind, dedupe]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await gdb.from("growth_signups").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Státusz frissítve"); qc.invalidateQueries({ queryKey: ["growth_signups"] }); }
  };

  return (
    <PageLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-cgi-surface-foreground">Jelentkezések</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="cgi-button-secondary"><RefreshCw className="h-4 w-4 mr-2" />Frissítés</Button>
      </div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <TabsList>
            <TabsTrigger value="venue_application">Partnerjelentkezések</TabsTrigger>
            <TabsTrigger value="waitlist">Várólista</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Switch id="dedupe" checked={dedupe} onCheckedChange={setDedupe} />
          <Label htmlFor="dedupe" className="text-cgi-muted-foreground">Ismétlődők elrejtése</Label>
        </div>
        <span className="text-sm text-cgi-muted-foreground">{rows.length} db</span>
      </div>
      <Card className="cgi-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dátum</TableHead>
              <TableHead>Név / hely</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Forrás</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Megjegyzés</TableHead>
              {kind === "venue_application" && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center text-cgi-muted-foreground">Betöltés…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-cgi-muted-foreground">Nincs jelentkezés</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.submitted_at), "yyyy.MM.dd HH:mm")}</TableCell>
                <TableCell>
                  <div className="font-medium">{r.venue_name || r.name || "—"}</div>
                  {r.venue_name && r.name && <div className="text-xs text-cgi-muted-foreground">{r.name}{r.city ? ` · ${r.city}` : ""}</div>}
                </TableCell>
                <TableCell className="text-xs">{r.email ? <a href={`mailto:${r.email}`} className="text-cgi-primary hover:underline">{r.email}</a> : "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{r.phone || "—"}</TableCell>
                <TableCell className="text-xs">{String(r.details?.source ?? "—")}</TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                    <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(SIGNUP_STATUSES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><NoteCell row={r} onSaved={() => qc.invalidateQueries({ queryKey: ["growth_signups"] })} /></TableCell>
                {kind === "venue_application" && (
                  <TableCell>
                    <Button size="sm" variant="outline" className="cgi-button-secondary whitespace-nowrap"
                      onClick={() => setTarget({ leadId: r.lead_id, venueName: r.venue_name || r.name || "Ismeretlen hely", email: r.email, phone: r.phone, signupId: r.id })}>
                      <Sparkles className="h-4 w-4 mr-1" />Ajánlat generálása
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <RequestOfferDialog target={target} onClose={() => setTarget(null)} onDone={() => qc.invalidateQueries({ queryKey: ["growth_signups"] })} />
    </PageLayout>
  );
}
