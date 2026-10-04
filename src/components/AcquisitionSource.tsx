import { Badge } from "@/components/ui/badge";
import { formatAcquisitionSource } from "@/lib/acquisitionSource";
import { cn } from "@/lib/utils";

interface AcquisitionSourceProps {
  value: string | null | undefined;
  showDetail?: boolean;
  className?: string;
}

export function AcquisitionSource({ value, showDetail = true, className }: AcquisitionSourceProps) {
  const source = formatAcquisitionSource(value);

  return (
    <div
      className={cn("min-w-0", className)}
      title={`Rögzített technikai forrás: ${source.raw}`}
    >
      <Badge
        variant="outline"
        className="max-w-full border-cgi-primary/30 bg-cgi-primary/10 text-cgi-primary"
      >
        <span className="truncate">{source.label}</span>
      </Badge>
      {showDetail && (
        <div className="mt-1 max-w-[260px] text-xs leading-4 text-cgi-muted-foreground">
          {source.detail}
        </div>
      )}
    </div>
  );
}
