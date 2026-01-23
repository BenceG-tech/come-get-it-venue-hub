import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MobileTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/**
 * MobileTooltip - A tooltip component that works on both desktop and mobile
 * - Desktop: Uses hover-based Radix Tooltip
 * - Mobile: Uses tap-based Popover for touch devices
 */
export function MobileTooltip({ 
  children, 
  content, 
  side = "top",
  className 
}: MobileTooltipProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  if (isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <span 
            className="cursor-pointer touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {children}
          </span>
        </PopoverTrigger>
        <PopoverContent 
          side={side}
          className={cn(
            "z-[100] max-w-xs p-3 text-sm bg-popover border border-cgi-primary/20 shadow-lg shadow-cgi-primary/10",
            className
          )}
          onPointerDownOutside={() => setOpen(false)}
        >
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{children}</span>
      </TooltipTrigger>
      <TooltipContent side={side} className={cn("max-w-xs", className)}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * InfoTooltip - A convenience wrapper that displays an info icon with tooltip
 */
interface InfoTooltipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  iconClassName?: string;
}

import { Info } from "lucide-react";

export function InfoTooltip({ content, side = "top", iconClassName }: InfoTooltipProps) {
  return (
    <MobileTooltip content={content} side={side}>
      <Info className={cn(
        "h-4 w-4 text-cgi-muted-foreground hover:text-cgi-surface-foreground transition-colors",
        iconClassName
      )} />
    </MobileTooltip>
  );
}
