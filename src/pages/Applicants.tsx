import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { RefreshCw, Search, StickyNote, Sparkles, ExternalLink } from "lucide-react";

type Source = "waitlist" | "venue_application";
type Status = "uj" | "kapcsolatban" | "felvett" | "elutasitva";

interface WaitlistSignup {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
}

interface VenueApplication {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  venue_name: string | null;
  venue_type: string | null;
  address_city: string | null;
  daily_customer_count: string | null;
  created_at: string;
}

interface Review {
  source: Source;
  external_id: string;
  status: Status;
  note: string | null;
  offer_status: "kert" | "kesz" | null;
  offer_url: string | null;
}

interface ApplicantsResponse {
  waitlist: WaitlistSignup[];
  partners: VenueApplication[];
  reviews: Review[];
}

const statusLabels: Record<Status, string> = {
  uj: "Új",
  kapcsolatban: "Kapcsolatban",
  felvett: "Felvéve",
  elutasitva: "Elutasítva",
};

const statusClasses: Record<Status, string> = {
  uj: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  kapcsolatban: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  felvett: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  elutasitva: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

async function callApplicants(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const response = await supabase.functions.invoke("admin-applicants", {
    body,
    headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
  });
  if (response.error) {
    const context = (response.error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      const payload = await context.json().catch(() => null);
      if (payload?.error) throw new Error(payload.error);
    }
    throw response.error;
  }
  return response.data;
}

function formatDate(value: string) {
  return format(new Date(value), "yyyy. MMM d. HH:mm", { locale: hu });
}

export default function Applicants() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [noteTarget, setNoteTarget] = useState<{ source: Source; id: string; label: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const { data, isLoading, error, refetch, isFetching } = useQuery<ApplicantsResponse>({
    queryKey: ["admin-applicants"],
    queryFn: () => callApplicants({ action: "list" }),
    retry: false,
  });

  const reviewFor = useMemo(() => {
    const map = new Map<string, Review>();
    for (const review of data?.reviews ?? []) {
      map.set(`${review.source}:${review.external_id}`, review);
    }
    return (source: Source, id: string) => map.get(`${source}:${id}`);
  }, [data?.reviews]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => callApplicants(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-applicants"] }),
    onError: (err: Error) => toast.error(`Nem sikerült menteni: ${err.message}`),
  });

  const matches = (source: Source, id: string, text: string) => {
    const status = reviewFor(source, id)?.status ?? "uj";
    if (statusFilter !== "all" && status !== statusFilter) return false;
    return !search || text.toLowerCase().includes(search.toLowerCase());
  };

  const partners = (data?.partners ?? []).filter((p) =>
    matches("venue_application", p.id, [p.venue_name, p.name, p.email, p.address_city].join(" "))
  );
  const waitlist = (data?.waitlist ?? []).filter((w) =>
    matches("waitlist", w.id, [w.email, w.source].join(" "))
  );

  const newCount = (source: Source, ids: string[]) =>
    ids.filter((id) => (reviewFor(source, id)?.status ?? "uj") === "uj").length;

  const statusSelect = (source: Source, id: string) => {
    const status = reviewFor(source, id)?.status ?? "uj";
    return (
      <Select
        value={status}
        onValueChange={(value) =>
          mutation.mutate({ action: "update", source, external_id: id, status: value })
        }
      >
        <SelectTrigger className={`h-8 w-[140px] border ${statusClasses[status]}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(statusLabels) as Status[]).map((key) => (
            <SelectItem key={key} value={key}>
              {statusLabels[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const noteButton = (source: Source, id: string, label: string) => {
    const note = reviewFor(source, id)?.note;
    return (
      <Button
        variant="ghost"
        size="sm"
        title={note ?? "Jegyzet hozzáadása"}
        onClick={() => {
          setNoteTarget({ source, id, label });
          setNoteDraft(note ?? "");
        }}
      >
        <StickyNote className={`h-4 w-4 ${note ? "text-amber-300" : "text-cgi-muted-foreground"}`} />
      </Button>
    );
  };

  const offerCell = (id: string) => {
    const review = reviewFor("venue_application", id);
    if (review?.offer_url) {
      return (
        <Button variant="outline" size="sm" asChild>
          <a href={review.offer_url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" /> Ajánlat
          </a>
        </Button>
      );
    }
    if (review?.offer_status === "kert") {
      return <Badge variant="outline">Ajánlat készül</Badge>;
    }
    return (
      <Button
        size="sm"
        variant="secondary"
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate(
            { action: "request_offer", source: "venue_application", external_id: id },
            { onSuccess: () => toast.success("Ajánlatkérés rögzítve") }
          )
        }
      >
        <Sparkles className="h-4 w-4 mr-1" /> Ajánlat
      </Button>
    );
  };

  const notConfigured = error instanceof Error && error.message === "crm_not_configured";

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cgi-surface-foreground">Jelentkezők</h1>
          <p className="text-cgi-muted-foreground mt-1">
            A weboldalon regisztrálók és a partnernek jelentkező helyek
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Frissítés
        </Button>
      </div>

      {error ? (
        <Card className="p-6 cgi-card">
          <p className="text-cgi-surface-foreground font-medium">
            {notConfigured
              ? "A weboldal adatbázisa még nincs összekötve az adminnal."
              : "Nem sikerült betölteni a jelentkezőket."}
          </p>
          <p className="text-cgi-muted-foreground text-sm mt-2">
            {notConfigured
              ? "Az admin-applicants függvényhez be kell állítani a CRM_SUPABASE_URL és CRM_SERVICE_ROLE_KEY titkot."
              : (error as Error).message}
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cgi-muted-foreground" />
              <Input
                placeholder="Keresés név, e-mail, hely vagy forrás szerint"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Minden állapot</SelectItem>
                {(Object.keys(statusLabels) as Status[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {statusLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="partners">
            <TabsList>
              <TabsTrigger value="partners">
                Partnerjelentkezők ({data?.partners.length ?? 0}
                {data ? `, ${newCount("venue_application", data.partners.map((p) => p.id))} új` : ""})
              </TabsTrigger>
              <TabsTrigger value="waitlist">
                Előregisztrálók ({data?.waitlist.length ?? 0}
                {data ? `, ${newCount("waitlist", data.waitlist.map((w) => w.id))} új` : ""})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="partners">
              <Card className="cgi-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hely</TableHead>
                      <TableHead>Kapcsolattartó</TableHead>
                      <TableHead>Napi vendég</TableHead>
                      <TableHead>Beérkezett</TableHead>
                      <TableHead>Állapot</TableHead>
                      <TableHead className="text-right">Teendő</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                          </TableRow>
                        ))
                      : partners.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-cgi-muted-foreground py-8">
                              Nincs találat
                            </TableCell>
                          </TableRow>
                        ) : partners.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="font-medium text-cgi-surface-foreground">{p.venue_name || "Névtelen hely"}</div>
                              <div className="text-xs text-cgi-muted-foreground">
                                {[p.venue_type, p.address_city].filter(Boolean).join(" · ")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>{p.name}</div>
                              <div className="text-xs text-cgi-muted-foreground">
                                {p.email && <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a>}
                                {p.phone && <> · <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a></>}
                              </div>
                            </TableCell>
                            <TableCell>{p.daily_customer_count || "–"}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(p.created_at)}</TableCell>
                            <TableCell>{statusSelect("venue_application", p.id)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {noteButton("venue_application", p.id, p.venue_name || p.email || "Jelentkező")}
                              {offerCell(p.id)}
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="waitlist">
              <Card className="cgi-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Forrás</TableHead>
                      <TableHead>Beérkezett</TableHead>
                      <TableHead>Állapot</TableHead>
                      <TableHead className="text-right">Jegyzet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                          </TableRow>
                        ))
                      : waitlist.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-cgi-muted-foreground py-8">
                              Nincs találat
                            </TableCell>
                          </TableRow>
                        ) : waitlist.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>
                              <a href={`mailto:${w.email}`} className="hover:underline">{w.email}</a>
                            </TableCell>
                            <TableCell>{w.source || "–"}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(w.created_at)}</TableCell>
                            <TableCell>{statusSelect("waitlist", w.id)}</TableCell>
                            <TableCell className="text-right">{noteButton("waitlist", w.id, w.email)}</TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={!!noteTarget} onOpenChange={(open) => !open && setNoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jegyzet: {noteTarget?.label}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={5}
            placeholder="Például: felhívtam, jövő héten visszahív"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)}>Mégse</Button>
            <Button
              onClick={() => {
                if (!noteTarget) return;
                mutation.mutate(
                  { action: "update", source: noteTarget.source, external_id: noteTarget.id, note: noteDraft },
                  { onSuccess: () => setNoteTarget(null) }
                );
              }}
              disabled={mutation.isPending}
            >
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
