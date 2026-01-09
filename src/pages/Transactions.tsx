
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/DataTable";
import { mockTransactions, formatCurrency, formatDateTime } from "@/lib/mockData";
import { Transaction } from "@/lib/types";

export default function Transactions() {
  const columns = [
    {
      key: 'timestamp' as keyof Transaction,
      label: 'Időpont',
      tooltip: 'A tranzakció pontos időpontja. Segít nyomon követni a napi forgalmi mintákat és csúcsidőket.',
      render: (value: string) => (
        <span className="text-cgi-surface-foreground">{formatDateTime(value)}</span>
      )
    },
    {
      key: 'amount' as keyof Transaction,
      label: 'Összeg',
      tooltip: 'A tranzakció teljes értéke forintban. Tartalmazza az összes megvásárolt terméket és szolgáltatást.',
      render: (value: number) => (
        <span className="font-medium text-cgi-secondary">
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'items' as keyof Transaction,
      label: 'Tételek',
      tooltip: 'A vásárlás részletes tételes bontása JSON formátumban. Tartalmazza a termékeket, árakat és mennyiségeket.',
      render: (value: Record<string, any>) => (
        <div className="max-w-xs">
          <code className="text-xs bg-cgi-muted px-2 py-1 rounded text-cgi-muted-foreground">
            {JSON.stringify(value).substring(0, 50)}...
          </code>
        </div>
      )
    },
    {
      key: 'points' as keyof Transaction,
      label: 'Pontok',
      tooltip: 'A tranzakcióért járó pontok száma. Ezeket a pontokat a felhasználók ingyenes italokra válthatják be.',
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <span className="font-medium text-cgi-secondary">{value}</span>
          <span className="text-xs text-cgi-muted-foreground">pt</span>
        </div>
      )
    }
  ];

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Tranzakciók</h1>
        <p className="text-cgi-muted-foreground">
          Az összes pénzügyi tranzakció áttekintése
        </p>
      </div>

      <div className="cgi-card">
        <DataTable 
          data={mockTransactions}
          columns={columns}
          searchPlaceholder="Keresés tranzakciók között..."
        />
      </div>
    </PageLayout>
  );
}
