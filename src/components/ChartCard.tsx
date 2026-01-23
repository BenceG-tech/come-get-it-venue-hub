
import { Card } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/mobile-tooltip";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  tooltip?: string;
}

export function ChartCard({ title, children, className = "", action, tooltip }: ChartCardProps) {
  return (
    <Card className={`cgi-card ${className}`}>
      <div className="cgi-card-header">
        <div className="flex items-center gap-2">
          <h3 className="cgi-card-title">{title}</h3>
          {tooltip && <InfoTooltip content={tooltip} />}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="mt-4">
        {children}
      </div>
    </Card>
  );
}
