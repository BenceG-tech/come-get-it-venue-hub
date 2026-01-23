import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Eye,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

interface Anomaly {
  id: string;
  entity_type: 'user' | 'venue' | 'platform';
  entity_id?: string;
  entity_name?: string;
  anomaly_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  detected_at: string;
  resolved_at?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
}

interface AnomalyStats {
  total_30_days: number;
  critical_count: number;
  resolved_count: number;
  false_positive_rate: number;
}

interface AnomalyReport {
  active_anomalies: Anomaly[];
  recent_resolved: Anomaly[];
  stats: AnomalyStats;
  generated_at: string;
}

interface AnomalyAlertListProps {
  compact?: boolean;
  maxItems?: number;
}

export function AnomalyAlertList({ compact = false, maxItems = 10 }: AnomalyAlertListProps) {
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-anomaly-report");
      
      if (fnError) throw fnError;
      
      setReport(data);
    } catch (err) {
      console.error("Error fetching anomalies:", err);
      setError("Nem sikerült betölteni az anomáliákat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const getSeverityColor = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-700';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-700';
      case 'info': return 'bg-green-500/10 border-green-500/30 text-green-700';
    }
  };

  const getSeverityIcon = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getEntityIcon = (entityType: Anomaly['entity_type']) => {
    switch (entityType) {
      case 'user': return <Users className="h-3 w-3" />;
      case 'venue': return <MapPin className="h-3 w-3" />;
      case 'platform': return <TrendingUp className="h-3 w-3" />;
    }
  };

  const getAnomalyTypeIcon = (type: string) => {
    if (type.includes('spike') || type.includes('high')) return <TrendingUp className="h-4 w-4 text-orange-500" />;
    if (type.includes('drop') || type.includes('low')) return <TrendingDown className="h-4 w-4 text-blue-500" />;
    return <Info className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Anomália Detektálás
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Anomália Detektálás
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <XCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchAnomalies}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Újrapróbálás
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const anomaliesToShow = report?.active_anomalies.slice(0, maxItems) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            🔍 Anomália Detektálás
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchAnomalies}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Stats */}
        {!compact && report?.stats && (
          <div className="flex gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">30 nap:</span>
              <span className="font-medium">{report.stats.total_30_days}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{report.stats.critical_count} kritikus</span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span>{report.stats.resolved_count} megoldva</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {anomaliesToShow.map((anomaly) => (
            <div 
              key={anomaly.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50 ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="flex flex-col items-center gap-1">
                {getSeverityIcon(anomaly.severity)}
                {getAnomalyTypeIcon(anomaly.anomaly_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{anomaly.title}</span>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    {getEntityIcon(anomaly.entity_type)}
                    {anomaly.entity_type === 'user' ? 'Felhasználó' : 
                     anomaly.entity_type === 'venue' ? 'Helyszín' : 'Platform'}
                  </Badge>
                </div>
                <p className="text-sm mt-1 opacity-80">{anomaly.description}</p>
                <p className="text-xs mt-1 opacity-60">
                  {formatDistanceToNow(new Date(anomaly.detected_at), { locale: hu, addSuffix: true })}
                </p>
              </div>
              
              <div className="flex flex-col gap-1">
                {anomaly.action_label && (
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    {anomaly.action_label.includes('Vizsgálat') ? (
                      <Eye className="h-3 w-3 mr-1" />
                    ) : null}
                    {anomaly.action_label}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs h-7 opacity-60">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  OK
                </Button>
              </div>
            </div>
          ))}
          
          {anomaliesToShow.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Minden rendben - nincs aktív anomália</span>
            </div>
          )}
        </div>

        {/* Recently resolved */}
        {!compact && report?.recent_resolved && report.recent_resolved.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Nemrég megoldott
            </h4>
            <div className="space-y-2">
              {report.recent_resolved.slice(0, 3).map((anomaly) => (
                <div 
                  key={anomaly.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm opacity-60"
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="truncate">{anomaly.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(anomaly.resolved_at!), { locale: hu, addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
