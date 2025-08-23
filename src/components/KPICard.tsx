
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  className?: string;
}

export function KPICard({ title, value, change, icon: Icon, className = "" }: KPICardProps) {
  return (
    <Card className={`cgi-card ${className}`}>
      <div className="cgi-card-header">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-cgi-secondary" />
          <h3 className="cgi-card-title">{title}</h3>
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
