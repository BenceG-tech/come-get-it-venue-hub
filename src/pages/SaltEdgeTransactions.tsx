import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Calendar, Filter, FlaskConical, Search } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createMockTransaction, fetchSpendTransactions } from "@/lib/spendPointsApi";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  awarded: { label: "Jóváírva", className: "bg-green-600" },
  capped: { label: "Napi plafon", className: "bg-amber-600" },
  pending: { label: "Könyvelésre vár", className: "bg-slate-500" },
  below_minimum: { label: "Minimum alatt", className: "bg-slate-500" },
  before_link: { label: "Csatolás előtti", className: "bg-slate-500" },
  not_participating: { label: "Hely nem gyűjt pontot", className: "bg-slate-500" },
  refund_deducted: { label: "Visszatérítés", className: "bg-red-600" },
  review: { label: "Ellenőrzésre vár", className: "bg-amber-600" },
  none: { label: "Nincs pont", className: "bg-slate-500" },
};

const today = () => new Date().toISOString().slice(0, 10);

function MockTransactionCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [amount, setAmount] = useState("10000");
  const [madeOn, setMadeOn] = useState(today());
  const [refund, setRefund] = useState(false);

  const { data: venues } = useQuery({
    queryKey: ["mock-tx-venues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: () =>
      createMockTransaction({
        user_id: userId.trim(),
        venue_id: venueId,
        amount_huf: Number(amount),
        made_on: madeOn,
        refund,
      }),
    onSuccess: (result) => {
      const tx = result.transaction;
      toast({
        title: "Teszt költés rögzítve",
        description: tx ? `${tx.points_awarded ?? 0} pont · ${STATUS_LABELS[tx.points_status]?.label ?? tx.points_status}` : "A tranzakció nem párosult.",
      });
      queryClient.invalidateQueries({ queryKey: ["spend-transactions"] });
    },
    onError: (error: Error) => {
      const message = error.message === "MOCK_MODE_ONLY"
        ? "A teszt költés csak SALTEDGE_MODE=mock beállításnál működik."
        : error.message;
      toast({ title: "Nem sikerült", description: message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Teszt költés (mock mód)
        </CardTitle>
        <CardDescription>
          Amíg nincs Salt Edge szerződés, itt szimulálható egy partnerhelyes kártyás fizetés. A párosítás a hely
          partnerazonosítási szabályaival történik, a pont ugyanúgy jóváíródik, mint élesben.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="mock-user">Felhasználó azonosító (UUID)</Label>
            <Input id="mock-user" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="a Felhasználók oldalról" />
          </div>
          <div className="space-y-2">
            <Label>Helyszín</Label>
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz" />
              </SelectTrigger>
              <SelectContent>
                {(venues ?? []).map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mock-amount">Összeg (Ft)</Label>
            <Input id="mock-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mock-date">Dátum</Label>
            <Input id="mock-date" type="date" value={madeOn} onChange={(e) => setMadeOn(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={refund} onCheckedChange={setRefund} />
            Visszatérítés
          </label>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !userId.trim() || !venueId || !(Number(amount) > 0)}
          >
            Teszt költés küldése
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SaltEdgeTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ["spend-transactions", dateFrom, dateTo, statusFilter],
    queryFn: () => fetchSpendTransactions({ from: dateFrom || undefined, to: dateTo || undefined, status: statusFilter }),
  });

  const formatAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat("hu-HU", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);

  const term = searchTerm.trim().toLowerCase();
  const filtered = (transactions ?? []).filter(
    (tx) =>
      !term ||
      (tx.merchant_name ?? "").toLowerCase().includes(term) ||
      (tx.description ?? "").toLowerCase().includes(term) ||
      (tx.venues?.name ?? "").toLowerCase().includes(term)
  );

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Költés-tranzakciók (Salt Edge)</h1>
        <p className="text-cgi-muted-foreground">
          Partnerhelyen történt, bankból beolvasott fizetések és a belőlük jóváírt pontok. Más tranzakciót nem tárolunk.
        </p>
      </div>

      <div className="space-y-6">
        <MockTransactionCard />

        <Card>
          <CardHeader>
            <CardTitle>Párosított tranzakciók</CardTitle>
            <CardDescription>Alap szabály: 100 Ft = 1 pont, minimum 500 Ft, napi 300 pont helyenként.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">
                    <Search className="h-4 w-4 inline mr-2" />
                    Keresés
                  </Label>
                  <Input
                    id="search"
                    placeholder="Kereskedő vagy hely..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    <Filter className="h-4 w-4 inline mr-2" />
                    Pont státusz
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFrom">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Dátum-tól
                  </Label>
                  <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateTo">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Dátum-ig
                  </Label>
                  <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{filtered.length} tranzakció</p>

              {error ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Nem sikerült betölteni a tranzakciókat. Lehet, hogy az adatbázis-migráció még nincs alkalmazva.
                </div>
              ) : isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dátum</TableHead>
                        <TableHead>Kereskedő</TableHead>
                        <TableHead>Helyszín</TableHead>
                        <TableHead className="text-right">Összeg</TableHead>
                        <TableHead>Státusz</TableHead>
                        <TableHead className="text-right">Pont</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nincs megjeleníthető tranzakció
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((tx) => {
                          const status = STATUS_LABELS[tx.points_status] ?? STATUS_LABELS.none;
                          const points = tx.points_awarded ?? 0;
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono text-sm">
                                {format(new Date(tx.made_on), "yyyy.MM.dd.", { locale: hu })}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{tx.merchant_name ?? "—"}</div>
                                {tx.description && <div className="text-sm text-muted-foreground">{tx.description}</div>}
                              </TableCell>
                              <TableCell className="text-sm">{tx.venues?.name ?? "—"}</TableCell>
                              <TableCell className="text-right font-mono">
                                {tx.is_refund ? "−" : ""}
                                {formatAmount(tx.amount_cents, tx.currency)}
                              </TableCell>
                              <TableCell>
                                <Badge className={status.className}>{status.label}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {points > 0 ? (
                                  <span className="text-green-600">+{points}</span>
                                ) : points < 0 ? (
                                  <span className="text-red-500">{points}</span>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
