
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Clock, Pause, Play, TrendingUp } from "lucide-react";
import { 
  mockStaffKPIData, 
  mockTodayRedemptions,
  mockTodayTopDrinks,
  formatCurrency,
  formatTime
} from "@/lib/mockData";
import { useState } from "react";

export function StaffDashboard() {
  const [isFreeDrinkPaused, setIsFreeDrinkPaused] = useState(false);

  const handleToggleFreeDrink = () => {
    setIsFreeDrinkPaused(!isFreeDrinkPaused);
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Operatív Dashboard</h1>
        <p className="text-cgi-muted-foreground">
          Mai állapot és gyors műveletek
        </p>
      </div>

      {/* Today's KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="Mai beváltások"
          value={mockStaffKPIData.today_redemptions}
          change={{ value: 8, isPositive: true }}
          icon={Receipt}
        />
        <KPICard
          title="Free drink státusz"
          value={isFreeDrinkPaused ? "Szüneteltetve" : "Aktív"}
          change={{ value: 0, isPositive: true }}
          icon={Clock}
        />
        <KPICard
          title="Cap kihasználtság"
          value={`${mockStaffKPIData.cap_usage}%`}
          change={{ value: 12, isPositive: true }}
          icon={TrendingUp}
        />
      </div>

      {/* Operational Controls */}
      <ChartCard title="Operatív vezérlők">
        <div className="flex flex-col md:flex-row gap-4">
          <Button
            onClick={handleToggleFreeDrink}
            className={`flex-1 h-16 text-lg font-medium ${
              isFreeDrinkPaused 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isFreeDrinkPaused ? (
              <>
                <Play className="h-6 w-6 mr-3" />
                Free Drink Indítása
              </>
            ) : (
              <>
                <Pause className="h-6 w-6 mr-3" />
                Free Drink Szüneteltetése
              </>
            )}
          </Button>
          
          <div className="flex-1 flex items-center justify-center">
            <Badge 
              variant={isFreeDrinkPaused ? "destructive" : "default"}
              className="text-lg px-4 py-2"
            >
              {isFreeDrinkPaused ? "SZÜNETELTETVE" : "AKTÍV"}
            </Badge>
          </div>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Redemption Feed */}
        <ChartCard title="Mai beváltások - Élő feed">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {mockTodayRedemptions.map((redemption) => (
              <div key={redemption.id} className="flex items-center justify-between p-3 bg-cgi-muted/20 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-cgi-surface-foreground">{redemption.drink}</span>
                    <Badge variant={redemption.user_type === 'new' ? 'default' : 'secondary'} className="text-xs">
                      {redemption.user_type === 'new' ? 'Új' : 'Visszatérő'}
                    </Badge>
                  </div>
                  <p className="text-sm text-cgi-muted-foreground">
                    {redemption.location} • {formatTime(redemption.time)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(redemption.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Today's Top Drinks */}
        <ChartCard title="Mai top italok">
          <div className="space-y-3">
            {mockTodayTopDrinks.map((drink, index) => (
              <div key={drink.name} className="flex items-center justify-between p-3 bg-cgi-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cgi-secondary/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-cgi-secondary">#{index + 1}</span>
                  </div>
                  <span className="font-medium text-cgi-surface-foreground">{drink.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{drink.count} db</p>
                  <p className="text-sm text-cgi-muted-foreground">{formatCurrency(drink.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
