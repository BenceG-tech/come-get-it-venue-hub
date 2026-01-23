import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  MapPin,
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Wine,
  Eye,
  Gift
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { LoyaltyAlertsPanel } from "@/components/dashboard/LoyaltyAlertsPanel";

interface VenueActivity {
  venue_id: string;
  venue_name: string;
  active_count: number;
  redemptions_today: number;
}

interface RecentActivity {
  id: string;
  type: 'redemption' | 'app_open' | 'venue_browse' | 'points_earned';
  user_id: string;
  user_name: string;
  venue_name?: string;
  drink_name?: string;
  timestamp: string;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  entity_type: 'venue' | 'user' | 'platform';
  entity_id?: string;
  entity_name?: string;
  action_label?: string;
  detected_at: string;
}

interface PlatformStatus {
  timestamp: string;
  metrics: {
    active_users_now: number;
    active_users_change: number;
    redemptions_per_minute: number;
    redemptions_change: number;
    hottest_venue: {
      id: string;
      name: string;
      active_count: number;
    } | null;
  };
  venue_activity: VenueActivity[];
  recent_feed: RecentActivity[];
  alerts: Alert[];
}

export default function CommandCenter() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-live-platform-status");
      
      if (error) throw error;
      
      setStatus(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching platform status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchStatus, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'redemption': return <Wine className="h-4 w-4 text-green-500" />;
      case 'app_open': return <Eye className="h-4 w-4 text-blue-500" />;
      case 'venue_browse': return <MapPin className="h-4 w-4 text-purple-500" />;
      case 'points_earned': return <Gift className="h-4 w-4 text-amber-500" />;
    }
  };

  const getActivityLabel = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'redemption':
        return `${activity.user_name} - beváltás${activity.venue_name ? ` @ ${activity.venue_name}` : ''}${activity.drink_name ? ` (${activity.drink_name})` : ''}`;
      case 'app_open':
        return `${activity.user_name} - app megnyitás`;
      case 'venue_browse':
        return `${activity.user_name} - helyszín böngészés${activity.venue_name ? ` (${activity.venue_name})` : ''}`;
      case 'points_earned':
        return `${activity.user_name} - pontszerzés`;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-700';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-700';
      case 'info': return 'bg-green-500/10 border-green-500/30 text-green-700';
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">🎯 Live Command Center</h1>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 animate-pulse">
              ● LIVE
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Utolsó frissítés: {lastUpdate ? formatDistanceToNow(lastUpdate, { locale: hu, addSuffix: true }) : '-'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-500/10' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manuális'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Users */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aktív most</p>
                  <p className="text-3xl font-bold">{status?.metrics.active_users_now || 0} fő</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                {(status?.metrics.active_users_change || 0) >= 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">+{status?.metrics.active_users_change || 0}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600">{status?.metrics.active_users_change || 0}</span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">vs 5 perce</span>
              </div>
            </CardContent>
          </Card>

          {/* Redemptions per minute */}
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Beváltás/perc</p>
                  <p className="text-3xl font-bold">{status?.metrics.redemptions_per_minute || 0}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                {(status?.metrics.redemptions_change || 0) >= 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">+{status?.metrics.redemptions_change || 0}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600">{status?.metrics.redemptions_change || 0}</span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">vs átlag</span>
              </div>
            </CardContent>
          </Card>

          {/* Hottest Venue */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">🔥 Legforróbb</p>
                  <p className="text-xl font-bold truncate">
                    {status?.metrics.hottest_venue?.name || 'Nincs adat'}
                  </p>
                </div>
                <div className="p-3 bg-orange-500/20 rounded-full">
                  <MapPin className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              {status?.metrics.hottest_venue && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {status.metrics.hottest_venue.active_count} aktív felhasználó
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Venue Activity Map (simplified as list) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Élő Helyszín Aktivitás
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {status?.venue_activity.slice(0, 6).map((venue, index) => (
                  <div 
                    key={venue.venue_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/venues/${venue.venue_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-orange-500 text-white' :
                        index === 1 ? 'bg-orange-400 text-white' :
                        index === 2 ? 'bg-orange-300 text-white' :
                        'bg-muted-foreground/20'
                      }`}>
                        {venue.active_count}
                      </div>
                      <div>
                        <p className="font-medium">{venue.venue_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {venue.redemptions_today} beváltás ma
                        </p>
                      </div>
                    </div>
                    {venue.active_count > 0 && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 text-xs">
                        aktív
                      </Badge>
                    )}
                  </div>
                ))}
                {(!status?.venue_activity || status.venue_activity.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    Nincs aktív helyszín
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Real-time Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {status?.recent_feed.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{getActivityLabel(activity)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { locale: hu, addSuffix: true })}
                        </p>
                      </div>
                      {activity.type === 'venue_browse' && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 shrink-0">
                          PUSH READY
                        </Badge>
                      )}
                    </div>
                  ))}
                  {(!status?.recent_feed || status.recent_feed.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      Nincs friss aktivitás
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              🚨 Aktív Alertek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status?.alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm mt-1 opacity-80">{alert.description}</p>
                  </div>
                  {alert.action_label && (
                    <Button variant="outline" size="sm" className="shrink-0">
                      {alert.action_label}
                    </Button>
                  )}
                </div>
              ))}
              {(!status?.alerts || status.alerts.length === 0) && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Minden rendben - nincs aktív alert</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Alerts Panel */}
        <LoyaltyAlertsPanel />
      </div>
    </PageLayout>
  );
}
