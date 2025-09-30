import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Calendar, Download, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface SaltEdgeTransaction {
  id: string;
  made_on: string;
  amount_cents: number;
  currency: string;
  merchant_name: string;
  merchant_code?: string;
  mcc?: string;
  description: string;
  matched_venue_id?: string;
  match_status: "matched" | "unmatched" | "pending";
  points_awarded: number;
  venue_name?: string;
}

export default function SaltEdgeTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Mock data - will be replaced with real data from Supabase
  const mockTransactions: SaltEdgeTransaction[] = [
    {
      id: "1",
      made_on: "2025-01-15",
      amount_cents: 4500,
      currency: "HUF",
      merchant_name: "FIRST CRAFT BEER",
      mcc: "5813",
      description: "Kártyás fizetés",
      matched_venue_id: "venue1",
      match_status: "matched",
      points_awarded: 45,
      venue_name: "FIRST Craft Beer & BBQ"
    },
    {
      id: "2",
      made_on: "2025-01-14",
      amount_cents: 8200,
      currency: "HUF",
      merchant_name: "UNKNOWN MERCHANT",
      description: "POS transaction",
      match_status: "unmatched",
      points_awarded: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return <Badge variant="default" className="bg-green-600">Párosítva</Badge>;
      case "unmatched":
        return <Badge variant="secondary">Nincs párosítás</Badge>;
      case "pending":
        return <Badge variant="outline">Feldolgozás alatt</Badge>;
      default:
        return null;
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesSearch = searchTerm === "" || 
      tx.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || tx.match_status === statusFilter;
    
    const matchesDateFrom = !dateFrom || tx.made_on >= dateFrom;
    const matchesDateTo = !dateTo || tx.made_on <= dateTo;
    
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Banki tranzakciók (AIS)</h1>
        <p className="text-cgi-muted-foreground">
          Banki tranzakciók automatikus párosítása a merchant szabályok alapján
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Salt Edge tranzakciók</CardTitle>
            <CardDescription>
              Banki tranzakciók automatikus párosítása a merchant szabályok alapján.
              A rendszer a Salt Edge AIS szolgáltatáson keresztül olvassa be a tranzakciókat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">
                    <Search className="h-4 w-4 inline mr-2" />
                    Keresés
                  </Label>
                  <Input
                    id="search"
                    placeholder="Kereskedő neve..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    <Filter className="h-4 w-4 inline mr-2" />
                    Státusz
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes</SelectItem>
                      <SelectItem value="matched">Párosítva</SelectItem>
                      <SelectItem value="unmatched">Nincs párosítás</SelectItem>
                      <SelectItem value="pending">Feldolgozás alatt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFrom">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Dátum-tól
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateTo">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Dátum-ig
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredTransactions.length} tranzakció
                </p>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportálás
                </Button>
              </div>

              {/* Transactions Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Kereskedő</TableHead>
                      <TableHead>MCC</TableHead>
                      <TableHead className="text-right">Összeg</TableHead>
                      <TableHead>Státusz</TableHead>
                      <TableHead>Párosított helyszín</TableHead>
                      <TableHead className="text-right">Pont</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nincs megjeleníthető tranzakció
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(tx.made_on), "yyyy.MM.dd.", { locale: hu })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tx.merchant_name}</div>
                              {tx.description && (
                                <div className="text-sm text-muted-foreground">
                                  {tx.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tx.mcc ? (
                              <Badge variant="outline" className="font-mono">
                                {tx.mcc}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAmount(tx.amount_cents, tx.currency)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(tx.match_status)}
                          </TableCell>
                          <TableCell>
                            {tx.venue_name ? (
                              <span className="text-sm">{tx.venue_name}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {tx.points_awarded > 0 ? (
                              <span className="text-green-600">+{tx.points_awarded}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Hogyan működik?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              A Salt Edge AIS (Account Information Service) rendszeren keresztül a felhasználók
              biztonságosan összekapcsolhatják banki számlájukat.
            </p>
            <p>
              Amikor költenek egy partner helyszínen, a rendszer automatikusan párosítja a tranzakciót
              a beállított merchant szabályok alapján (név, MCC kód, IBAN, stb.).
            </p>
            <p className="text-muted-foreground">
              <strong>Adatvédelem:</strong> Csak a minimálisan szükséges tranzakciós adatok kerülnek
              tárolásra (összeg, kereskedő neve, dátum). Részletes számlainformációk nem.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
