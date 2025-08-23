
import { Sidebar } from "@/components/Sidebar";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { mockRedemptions, formatCurrency, formatTime } from "@/lib/mockData";
import { Redemption } from "@/lib/types";

export default function Redemptions() {
  const columns = [
    {
      key: 'date' as keyof Redemption,
      label: 'Dátum',
      render: (value: string, item: Redemption) => (
        <div>
          <div className="font-medium text-cgi-surface-foreground">{value}</div>
          <div className="text-sm text-cgi-muted-foreground">{formatTime(item.time)}</div>
        </div>
      )
    },
    {
      key: 'user_id' as keyof Redemption,
      label: 'Felhasználó',
      render: (value: string) => (
        <code className="text-xs bg-cgi-muted px-2 py-1 rounded text-cgi-secondary">
          {value}
        </code>
      )
    },
    {
      key: 'drink' as keyof Redemption,
      label: 'Ital',
      render: (value: string) => (
        <span className="font-medium text-cgi-surface-foreground">{value}</span>
      )
    },
    {
      key: 'value' as keyof Redemption,
      label: 'Érték',
      render: (value: number) => (
        <span className="font-medium text-cgi-secondary">
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'location' as keyof Redemption,
      label: 'Helyszín',
      render: (value: string) => (
        <span className="text-cgi-surface-foreground">{value}</span>
      )
    },
    {
      key: 'user_type' as keyof Redemption,
      label: 'Felhasználó típus',
      render: (value: 'new' | 'returning') => (
        <Badge className={value === 'new' ? 'cgi-badge-info' : 'cgi-badge-success'}>
          {value === 'new' ? 'Új' : 'Visszatérő'}
        </Badge>
      )
    }
  ];

  return (
    <div className="cgi-page flex">
      <Sidebar />
      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="cgi-container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Beváltások</h1>
            <p className="text-cgi-muted-foreground">
              A Come Get It alkalmazáson keresztül beváltott italok listája
            </p>
          </div>

          <div className="cgi-card">
            <DataTable 
              data={mockRedemptions}
              columns={columns}
              searchPlaceholder="Keresés beváltások között..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
