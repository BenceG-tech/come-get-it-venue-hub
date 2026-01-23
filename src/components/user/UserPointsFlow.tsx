import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowUp, ArrowDown } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface PointsFlowProps {
  earningsByType: Record<string, number>;
  spendingByType: Record<string, number>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string | null;
    created_at: string;
  }>;
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

const EARNING_COLORS = [
  "hsl(142, 76%, 36%)",  // green
  "hsl(182, 71%, 42%)",  // primary
  "hsl(200, 88%, 32%)",  // secondary
];

const SPENDING_COLORS = [
  "hsl(0, 84%, 60%)",    // red
  "hsl(25, 95%, 53%)",   // orange
  "hsl(45, 93%, 47%)",   // yellow
];

const typeLabels: Record<string, string> = {
  purchase: "Vásárlás",
  transaction: "Tranzakció",
  bonus: "Bónusz",
  promotion: "Promóció",
  redemption: "Beváltás",
  reward: "Jutalom",
  other: "Egyéb"
};

export function UserPointsFlow({
  earningsByType,
  spendingByType,
  recentTransactions,
  currentBalance,
  lifetimeEarned,
  lifetimeSpent
}: PointsFlowProps) {
  const earningsData = Object.entries(earningsByType).map(([type, value], i) => ({
    name: typeLabels[type] || type,
    value,
    fill: EARNING_COLORS[i % EARNING_COLORS.length]
  }));

  const spendingsData = Object.entries(spendingByType).map(([type, value], i) => ({
    name: typeLabels[type] || type,
    value,
    fill: SPENDING_COLORS[i % SPENDING_COLORS.length]
  }));

  const hasEarnings = earningsData.length > 0;
  const hasSpendings = spendingsData.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cgi-card">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-cgi-secondary">{currentBalance}</p>
            <p className="text-sm text-cgi-muted-foreground">Egyenleg</p>
          </CardContent>
        </Card>
        <Card className="cgi-card">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-cgi-success">{lifetimeEarned}</p>
            <p className="text-sm text-cgi-muted-foreground">Szerzett</p>
          </CardContent>
        </Card>
        <Card className="cgi-card">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-cgi-error">{lifetimeSpent}</p>
            <p className="text-sm text-cgi-muted-foreground">Elköltött</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Earnings Breakdown */}
        <Card className="cgi-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-cgi-surface-foreground flex items-center gap-2 text-base">
              <ArrowUp className="h-4 w-4 text-cgi-success" />
              Pontszerzés forrásai
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasEarnings ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={earningsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {earningsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--cgi-surface))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`${value} pont`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-cgi-muted-foreground text-sm">
                Nincs adat
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending Breakdown */}
        <Card className="cgi-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-cgi-surface-foreground flex items-center gap-2 text-base">
              <ArrowDown className="h-4 w-4 text-cgi-error" />
              Pontfelhasználás
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasSpendings ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={spendingsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {spendingsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--cgi-surface))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`${value} pont`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-cgi-muted-foreground text-sm">
                Nincs adat
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="cgi-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-cgi-surface-foreground flex items-center gap-2 text-base">
            <Coins className="h-4 w-4 text-cgi-primary" />
            Legutóbbi pont tranzakciók
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-6 text-cgi-muted-foreground text-sm">
              Nincs pont tranzakció
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-cgi-muted/20"
                >
                  <div className="flex items-center gap-3">
                    {tx.amount > 0 ? (
                      <ArrowUp className="h-4 w-4 text-cgi-success" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-cgi-error" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-cgi-surface-foreground">
                        {tx.description || typeLabels[tx.type] || tx.type}
                      </p>
                      <p className="text-xs text-cgi-muted-foreground">
                        {format(new Date(tx.created_at), "yyyy.MM.dd HH:mm", { locale: hu })}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    className={tx.amount > 0 
                      ? "bg-cgi-success/20 text-cgi-success border-cgi-success/30"
                      : "bg-cgi-error/20 text-cgi-error border-cgi-error/30"
                    }
                  >
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}