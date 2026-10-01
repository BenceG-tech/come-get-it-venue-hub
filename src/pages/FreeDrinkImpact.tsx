import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { sessionManager } from "@/auth/session";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAcquisitionStats,
  fetchFreeDrinkImpact,
  fetchReferralCodes,
  saveReferralCode,
} from "@/lib/spendPointsApi";

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const huf = (value: number | null | undefined) =>
  value == null ? "—" : new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(value);
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

function ReferralCodeCell({ venueId, initial }: { venueId: string; initial: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(initial ?? "");
  const mutation = useMutation({
    mutationFn: () => saveReferralCode(venueId, value),
    onSuccess: () => {
      toast({ title: "Helykód mentve" });
      queryClient.invalidateQueries({ queryKey: ["referral-codes"] });
    },
    onError: (error: Error) =>
      toast({
        title: "Nem sikerült menteni",
        description: error.message.includes("referral_code") ? "4–12 karakter, csak betű és szám, és egyedi legyen." : error.message,
        variant: "destructive",
      }),
  });
  const dirty = (initial ?? "") !== value.trim().toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="pl. FIRST24"
        maxLength={12}
        className="h-8 w-28 font-mono"
      />
      {dirty && (
        <Button size="sm" variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Mentés
        </Button>
      )}
    </div>
  );
}

export default function FreeDrinkImpact() {
  const session = sessionManager.getCurrentSession();
  const isAdmin = session?.user.role === "cgi_admin";
  const canEditCodes = isAdmin || session?.user.role === "venue_owner";
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [includeTest, setIncludeTest] = useState(false);

  const impact = useQuery({
    queryKey: ["free-drink-impact", from, to, includeTest],
    queryFn: () => fetchFreeDrinkImpact(from, to, includeTest),
  });
  const acquisition = useQuery({
    queryKey: ["acquisition-stats", from, to],
    queryFn: () => fetchAcquisitionStats(from, to),
  });
  const codes = useQuery({ queryKey: ["referral-codes"], queryFn: fetchReferralCodes, enabled: canEditCodes });

  const failed = impact.error || acquisition.error;

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Ingyen ital hatása</h1>
        <p className="text-cgi-muted-foreground">
          Mennyit költöttek a vendégek azon a napon, amikor beváltották az ingyen italt, és ki hozta az új felhasználókat.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="from">Dátum-tól</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">Dátum-ig</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm pb-2">
            <Switch checked={includeTest} onCheckedChange={setIncludeTest} />
            Teszt (mock/sandbox) adatokkal
          </label>
        )}
      </div>

      {failed ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Nem sikerült betölteni a riportot. Lehet, hogy az adatbázis-migráció még nincs alkalmazva.
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Költés a beváltás napján</CardTitle>
              <CardDescription>
                Csak a bankot csatolt vendégek költése látszik; a „Mérhető” oszlop mutatja, hány beváltásnál volt ez így.
                A kísérő költés nem azonos a többletforgalommal: törzsvendég ingyen ital nélkül is költött volna.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {impact.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Helyszín</TableHead>
                        <TableHead className="text-right">Beváltás</TableHead>
                        <TableHead className="text-right">Mérhető</TableHead>
                        <TableHead className="text-right">Költött is</TableHead>
                        <TableHead className="text-right">Ebből először fizetett ott</TableHead>
                        <TableHead className="text-right">Átlagos költés</TableHead>
                        <TableHead className="text-right">Összes költés</TableHead>
                        <TableHead className="text-right">Visszatért 30 napon belül</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(impact.data ?? []).map((row) => (
                        <TableRow key={row.venue_id}>
                          <TableCell className="font-medium">{row.venue_name}</TableCell>
                          <TableCell className="text-right">{row.redemptions}</TableCell>
                          <TableCell className="text-right">{row.measurable_redemptions}</TableCell>
                          <TableCell className="text-right">
                            {row.converted_redemptions} ({pct(row.converted_redemptions, row.measurable_redemptions)})
                          </TableCell>
                          <TableCell className="text-right">{row.new_guest_converted}</TableCell>
                          <TableCell className="text-right">{huf(row.avg_spend_huf)}</TableCell>
                          <TableCell className="text-right">{huf(row.total_spend_huf)}</TableCell>
                          <TableCell className="text-right">
                            {row.returned_30d} ({pct(row.returned_30d, row.redemptions)})
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ki hozta az új felhasználót?</CardTitle>
              <CardDescription>
                Az első beváltás helye szerint. Helykóddal: a vendég megadta a hely kódját. Helyben regisztrált: a
                regisztráció után 3 órán belül itt váltotta be az első italt. Come Get It hozta: korábban regisztrált, és
                később jött el ide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {acquisition.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Helyszín</TableHead>
                        <TableHead className="text-right">Új felhasználó</TableHead>
                        <TableHead className="text-right">Helykóddal</TableHead>
                        <TableHead className="text-right">Helyben regisztrált</TableHead>
                        <TableHead className="text-right">Come Get It hozta</TableHead>
                        <TableHead className="text-right">Hely által hozott, máshol is járt</TableHead>
                        {canEditCodes && <TableHead>Helykód</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(acquisition.data ?? []).map((row) => (
                        <TableRow key={row.venue_id}>
                          <TableCell className="font-medium">{row.venue_name}</TableCell>
                          <TableCell className="text-right">{row.new_users}</TableCell>
                          <TableCell className="text-right">{row.venue_code_users}</TableCell>
                          <TableCell className="text-right">{row.venue_walk_in_users}</TableCell>
                          <TableCell className="text-right">{row.cgi_users}</TableCell>
                          <TableCell className="text-right">{row.venue_sourced_active_elsewhere}</TableCell>
                          {canEditCodes && (
                            <TableCell>
                              {codes.isLoading ? null : (
                                <ReferralCodeCell
                                  key={`${row.venue_id}-${codes.data?.[row.venue_id] ?? ""}`}
                                  venueId={row.venue_id}
                                  initial={codes.data?.[row.venue_id] ?? null}
                                />
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
