
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
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
        {action && <div>{action}</div>}
      </div>
      <div className="mt-4">
        {children}
      </div>
    </Card>
  );
}
