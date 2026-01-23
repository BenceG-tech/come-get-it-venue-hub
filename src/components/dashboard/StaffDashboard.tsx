import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Clock, Pause, Play, TrendingUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { useDashboardStats, formatCurrency, formatTime } from "@/hooks/useDashboardStats";
import { UserLink, VenueLink, DrinkLink } from "@/components/ui/entity-links";
import { RedemptionContextBadges } from "@/components/RedemptionContextBadges";
import { MobileTooltip } from "@/components/ui/mobile-tooltip";

interface RecentRedemption {
  id: string;
  drink: string;
  value: number;
  time: string;
  user_type: string;
  user_id?: string;
  user_name?: string;
  venue_id?: string;
  venue_name?: string;
  visits_total?: number;
  visits_this_week?: number;
}

export function StaffDashboard() {
  const [isFreeDrinkPaused, setIsFreeDrinkPaused] = useState(false);
  
  // TODO: Get venue_id from session/context when available
  const venueId = undefined;
  const { data: stats, isLoading } = useDashboardStats('staff', venueId);

  const handleToggleFreeDrink = () => {
    setIsFreeDrinkPaused(!isFreeDrinkPaused);
  };

  const kpiData = {
    today_redemptions: stats?.today_redemptions ?? 0,
    cap_usage: stats?.cap_usage ?? 0,
  };

  const recentRedemptions = (stats?.recent_redemptions ?? []) as RecentRedemption[];
  const topDrinks = stats?.top_drinks ?? [];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Operatív Dashboard</h1>
        <p className="text-cgi-muted-foreground">
          Mai állapot és gyors műveletek
          {isLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
        </p>
      </div>

      {/* Today's KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="Mai beváltások"
          value={isLoading ? "..." : kpiData.today_redemptions.toLocaleString()}
          change={{ value: 8, isPositive: true }}
          icon={Receipt}
          tooltip="Az aktuális nap során az italbeváltó alkalmazáson keresztül beváltott italok teljes száma. Ez mutatja a napi forgalom aktivitását."
        />
        <KPICard
          title="Free drink státusz"
          value={isFreeDrinkPaused ? "Szüneteltetve" : "Aktív"}
          change={{ value: 0, isPositive: true }}
          icon={Clock}
          tooltip="A free drink kampány jelenlegi állapota. Aktív állapotban a felhasználók beválthatják az ingyenes italokat, szüneteltetett állapotban nem."
        />
        <KPICard
          title="Cap kihasználtság"
          value={isLoading ? "..." : `${kpiData.cap_usage}%`}
          change={{ value: 12, isPositive: true }}
          icon={TrendingUp}
          tooltip="A napi italbeváltási limit kihasználtsága százalékban. A cap védi a helyszínt a túlzott ingyenes italfogyasztástól."
        />
      </div>

      {/* Operational Controls */}
      <ChartCard 
        title="Operatív vezérlők"
        tooltip="Gyors műveletek a free drink kampány kezeléséhez. A szüneteltetés azonnal leállítja az új beváltásokat."
      >
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
        <ChartCard 
          title="Mai beváltások - Élő feed"
          tooltip="Valós idejű lista a mai beváltásokról. Kattints a felhasználó nevére a profiljához. Új és visszatérő felhasználók megkülönböztetésével."
        >
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cgi-muted-foreground" />
            </div>
          ) : recentRedemptions.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-cgi-muted-foreground">
              Nincs még mai beváltás
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentRedemptions.map((redemption) => (
                <div key={redemption.id} className="p-3 bg-cgi-muted/20 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Drink name and user type badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <DrinkLink
                          drinkName={redemption.drink}
                          size="sm"
                        />
                        <MobileTooltip content={redemption.user_type === 'new' ? 'Első látogatás ezen a helyszínen' : 'Már járt korábban itt'}>
                          <Badge variant={redemption.user_type === 'new' ? 'default' : 'secondary'} className="text-xs">
                            {redemption.user_type === 'new' ? 'Új' : 'Visszatérő'}
                          </Badge>
                        </MobileTooltip>
                      </div>
                      
                      {/* User and venue info */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {redemption.user_id && redemption.user_name && (
                          <UserLink
                            userId={redemption.user_id}
                            userName={redemption.user_name}
                            size="xs"
                          />
                        )}
                        {redemption.venue_id && redemption.venue_name && (
                          <>
                            <span className="text-cgi-muted-foreground text-xs">@</span>
                            <VenueLink
                              venueId={redemption.venue_id}
                              venueName={redemption.venue_name}
                              size="xs"
                            />
                          </>
                        )}
                      </div>

                      {/* Context badges */}
                      {(redemption.visits_total || redemption.visits_this_week) && (
                        <div className="mt-1.5">
                          <RedemptionContextBadges
                            visitsThisWeek={redemption.visits_this_week}
                            visitsTotal={redemption.visits_total}
                            showMilestones={true}
                            size="sm"
                          />
                        </div>
                      )}

                      <p className="text-xs text-cgi-muted-foreground mt-1">
                        {formatTime(redemption.time)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium text-cgi-secondary">{formatCurrency(redemption.value)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Today's Top Drinks */}
        <ChartCard 
          title="Mai top italok"
          tooltip="A mai nap legnépszerűbb italai beváltások száma és generált bevétel szerint rangsorolva. Segít a készletgazdálkodásban."
        >
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cgi-muted-foreground" />
            </div>
          ) : topDrinks.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-cgi-muted-foreground">
              Nincs még adat
            </div>
          ) : (
            <div className="space-y-3">
              {topDrinks.map((drink, index) => (
                <div key={drink.name} className="flex items-center justify-between p-3 bg-cgi-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MobileTooltip content={`${index + 1}. legnépszerűbb ital ma`}>
                      <div className="w-8 h-8 rounded-full bg-cgi-secondary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-cgi-secondary">#{index + 1}</span>
                      </div>
                    </MobileTooltip>
                    <DrinkLink drinkName={drink.name} size="sm" />
                  </div>
                  <div className="text-right">
                    <MobileTooltip content={`${drink.count} beváltás összesen`}>
                      <p className="font-medium">{drink.count} db</p>
                    </MobileTooltip>
                    <p className="text-sm text-cgi-muted-foreground">{formatCurrency(drink.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
