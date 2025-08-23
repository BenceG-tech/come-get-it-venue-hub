
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CapUsage } from '@/lib/types';

interface CapProgressBarProps {
  usage: CapUsage;
  label?: string;
  showBadge?: boolean;
}

export function CapProgressBar({ usage, label = "Napi kapacitás", showBadge = true }: CapProgressBarProps) {
  const getStatusColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-cgi-secondary';
  };

  const getStatusText = (pct: number) => {
    if (pct >= 100) return 'Elfogyott';
    if (pct >= 90) return 'Majdnem tele';
    if (pct >= 70) return 'Közeledik a limit';
    return 'Elérhető';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-cgi-surface-foreground">{label}</span>
        {showBadge && (
          <Badge 
            variant={usage.pct >= 90 ? "destructive" : usage.pct >= 70 ? "secondary" : "default"}
            className="cgi-badge"
          >
            {getStatusText(usage.pct)}
          </Badge>
        )}
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={usage.pct} 
          className="h-2"
        />
        <div className="flex justify-between text-xs text-cgi-muted-foreground">
          <span>{usage.used} beváltva</span>
          <span>{usage.limit > 0 ? `${usage.limit} limit` : 'Nincs limit'}</span>
        </div>
      </div>
    </div>
  );
}
