import { useState, useEffect } from 'react';
import { PageLayout } from "@/components/PageLayout";
import { DataTable, Column } from "@/components/DataTable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CreditCard, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Receipt,
  TrendingUp,
  DollarSign,
  Sparkles
} from "lucide-react";
import { POSTransaction, POSTransactionItem, AppliedPromotion } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { hu } from "date-fns/locale";
import { RouteGuard } from "@/components/RouteGuard";

const formatCurrency = (amount: number, currency: string = 'HUF'): string => {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

function TransactionDetails({ 
  items, 
  promotions, 
  basePoints, 
  bonusPoints, 
  totalPoints 
}: { 
  items: POSTransactionItem[]; 
  promotions: AppliedPromotion[];
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
}) {
  return (
    <div className="p-4 bg-cgi-muted/20 rounded-lg space-y-4">
      {/* Items */}
      <div>
        <h4 className="text-sm font-medium text-cgi-surface-foreground mb-2">Tételek</h4>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-cgi-surface-foreground">
                  {item.name} x{item.quantity}
                </span>
                {item.category && (
                  <Badge variant="outline" className="text-xs bg-cgi-muted/30">
                    {item.category}
                  </Badge>
                )}
                {item.brand && (
                  <Badge variant="outline" className="text-xs bg-cgi-secondary/20 text-cgi-secondary">
                    {item.brand}
                  </Badge>
                )}
              </div>
              <span className="text-cgi-muted-foreground">
                {formatCurrency(item.total_price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Promotions */}
      {promotions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-cgi-surface-foreground mb-2">Alkalmazott promóciók</h4>
          <div className="space-y-1">
            {promotions.map((promo, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-cgi-surface-foreground">{promo.promotion_name}</span>
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {promo.effect}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points breakdown */}
      <div className="pt-2 border-t border-cgi-muted">
        <h4 className="text-sm font-medium text-cgi-surface-foreground mb-2">Pont számítás</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-cgi-muted-foreground">Alap:</span>
            <span className="ml-2 text-cgi-surface-foreground font-medium">{basePoints} pt</span>
          </div>
          <div>
            <span className="text-cgi-muted-foreground">Bónusz:</span>
            <span className="ml-2 text-green-400 font-medium">+{bonusPoints} pt</span>
          </div>
          <div>
            <span className="text-cgi-muted-foreground">Összesen:</span>
            <span className="ml-2 text-cgi-secondary font-bold">{totalPoints} pt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [venues, setVenues] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load transactions and venues in parallel
      const [transactionsRes, venuesRes] = await Promise.all([
        supabase
          .from('pos_transactions')
          .select('*')
          .order('transaction_time', { ascending: false })
          .limit(100),
        supabase
          .from('venues')
          .select('id, name')
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (venuesRes.error) throw venuesRes.error;

      // Create venue lookup
      const venueMap: Record<string, string> = {};
      venuesRes.data?.forEach(v => { venueMap[v.id] = v.name; });
      setVenues(venueMap);

      // Transform and enrich transactions
      const enriched: POSTransaction[] = (transactionsRes.data || []).map(t => ({
        id: t.id,
        external_order_id: t.external_order_id,
        venue_id: t.venue_id,
        venue_name: venueMap[t.venue_id] || 'Ismeretlen',
        user_id: t.user_id,
        items: (t.items as unknown as POSTransactionItem[]) || [],
        subtotal: t.subtotal,
        discount_amount: t.discount_amount || 0,
        total_amount: t.total_amount,
        currency: t.currency || 'HUF',
        base_points: t.base_points || 0,
        bonus_points: t.bonus_points || 0,
        total_points: t.total_points || 0,
        applied_promotions: (t.applied_promotions as unknown as AppliedPromotion[]) || [],
        payment_method: t.payment_method,
        staff_id: t.staff_id,
        table_number: t.table_number,
        transaction_time: t.transaction_time,
        processed_at: t.processed_at,
        created_at: t.created_at,
      }));

      setTransactions(enriched);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a tranzakciókat",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredTransactions = transactions.filter(t =>
    t.venue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.external_order_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0);
  const totalPoints = transactions.reduce((sum, t) => sum + t.total_points, 0);
  const avgBasket = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const columns: Column<POSTransaction>[] = [
    {
      key: 'transaction_time',
      label: 'Időpont',
      priority: 'high',
      render: (value: string) => (
        <div className="text-sm">
          <div className="text-cgi-surface-foreground font-medium">
            {format(parseISO(value), 'yyyy.MM.dd', { locale: hu })}
          </div>
          <div className="text-cgi-muted-foreground">
            {format(parseISO(value), 'HH:mm', { locale: hu })}
          </div>
        </div>
      )
    },
    {
      key: 'venue_name',
      label: 'Helyszín',
      priority: 'high',
      render: (value: string) => (
        <span className="text-cgi-surface-foreground">{value || 'Ismeretlen'}</span>
      )
    },
    {
      key: 'total_amount',
      label: 'Összeg',
      priority: 'high',
      render: (value: number, transaction) => (
        <div>
          <span className="font-medium text-cgi-secondary">
            {formatCurrency(value, transaction.currency)}
          </span>
          {transaction.discount_amount > 0 && (
            <div className="text-xs text-green-400">
              -{formatCurrency(transaction.discount_amount)} kedvezmény
            </div>
          )}
        </div>
      )
    },
    {
      key: 'items',
      label: 'Tételek',
      priority: 'medium',
      render: (value: POSTransactionItem[]) => (
        <div className="max-w-xs">
          <span className="text-sm text-cgi-surface-foreground">
            {value.length} tétel
          </span>
          {value.length > 0 && (
            <div className="text-xs text-cgi-muted-foreground truncate">
              {value.slice(0, 2).map(i => i.name).join(', ')}
              {value.length > 2 && ` +${value.length - 2}`}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'total_points',
      label: 'Pontok',
      priority: 'high',
      render: (value: number, transaction) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-cgi-secondary">{value}</span>
          <span className="text-xs text-cgi-muted-foreground">pt</span>
          {transaction.bonus_points > 0 && (
            <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
              +{transaction.bonus_points}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'applied_promotions',
      label: 'Promóciók',
      priority: 'low',
      render: (value: AppliedPromotion[]) => (
        value.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 2).map((p, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-cgi-secondary/10 text-cgi-secondary border-cgi-secondary/30">
                {p.promotion_name}
              </Badge>
            ))}
            {value.length > 2 && (
              <span className="text-xs text-cgi-muted-foreground">+{value.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-cgi-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'id',
      label: '',
      priority: 'low',
      render: (_, transaction) => (
        <Button
          variant="ghost"
          size="sm"
          className="cgi-button-ghost"
          onClick={() => toggleRow(transaction.id)}
        >
          {expandedRows.has(transaction.id) ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      )
    }
  ];

  if (isLoading) {
    return (
      <RouteGuard requiredRoles={['cgi_admin', 'venue_owner']}>
        <PageLayout>
          <div className="animate-pulse">Betöltés...</div>
        </PageLayout>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredRoles={['cgi_admin', 'venue_owner']}>
      <PageLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-cgi-secondary" />
            <div>
              <h1 className="text-2xl font-bold text-cgi-surface-foreground">POS Tranzakciók</h1>
              <p className="text-cgi-muted-foreground">
                Goorderz POS rendszerből érkező tranzakciók és pontok
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cgi-secondary/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-cgi-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">{transactions.length}</p>
                  <p className="text-sm text-cgi-muted-foreground">Tranzakció</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-sm text-cgi-muted-foreground">Összes bevétel</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">
                    {formatCurrency(avgBasket)}
                  </p>
                  <p className="text-sm text-cgi-muted-foreground">Átlag kosár</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">{totalPoints}</p>
                  <p className="text-sm text-cgi-muted-foreground">Kiadott pont</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card className="p-4 cgi-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
              <Input
                placeholder="Keresés helyszín vagy rendelés ID alapján..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="cgi-input pl-10"
              />
            </div>
          </Card>

          {/* Transactions Table */}
          <div className="cgi-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cgi-muted">
                    {columns.map((col, idx) => (
                      <th key={idx} className="px-4 py-3 text-left text-sm font-medium text-cgi-muted-foreground">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <>
                      <tr 
                        key={transaction.id} 
                        className="border-b border-cgi-muted/50 hover:bg-cgi-muted/10 transition-colors"
                      >
                        {columns.map((col, idx) => (
                          <td key={idx} className="px-4 py-3">
                            {col.render 
                              ? col.render(transaction[col.key as keyof POSTransaction] as any, transaction) 
                              : String(transaction[col.key as keyof POSTransaction] || '')}
                          </td>
                        ))}
                      </tr>
                      {expandedRows.has(transaction.id) && (
                        <tr key={`${transaction.id}-details`}>
                          <td colSpan={columns.length} className="px-4 py-2">
                            <TransactionDetails
                              items={transaction.items}
                              promotions={transaction.applied_promotions}
                              basePoints={transaction.base_points}
                              bonusPoints={transaction.bonus_points}
                              totalPoints={transaction.total_points}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="p-8 text-center text-cgi-muted-foreground">
                  {transactions.length === 0 
                    ? 'Még nincsenek POS tranzakciók'
                    : 'Nincs találat a keresésre'}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </RouteGuard>
  );
}
