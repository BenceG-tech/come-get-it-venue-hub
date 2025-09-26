
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon, Info } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  className?: string;
  tooltip?: string;
}

export function KPICard({ title, value, change, icon: Icon, className = "", tooltip }: KPICardProps) {
  return (
    <Card className={`cgi-card ${className}`}>
      <div className="cgi-card-header">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-cgi-secondary" />
          <h3 className="cgi-card-title">{title}</h3>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-cgi-muted-foreground hover:text-cgi-surface-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {change && (
          <div className={`flex items-center text-sm ${
            change.isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            <span>{change.isPositive ? '+' : ''}{change.value}%</span>
          </div>
        )}
      </div>
      <div className="cgi-card-value">{value}</div>
    </Card>
  );
}
