
import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function ChartCard({ title, children, className = "", action }: ChartCardProps) {
  return (
    <Card className={`cgi-card ${className}`}>
      <div className="cgi-card-header">
        <h3 className="cgi-card-title">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="mt-4">
        {children}
      </div>
    </Card>
  );
}
