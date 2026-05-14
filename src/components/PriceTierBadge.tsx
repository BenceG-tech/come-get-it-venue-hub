import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceTierBadgeProps {
  tier?: number | null;
  size?: 'sm' | 'md';
  className?: string;
  /** When true, also render empty/inactive dollars in muted color */
  showEmpty?: boolean;
}

/**
 * Visual price tier indicator (1–4 dollar signs).
 * Returns null when tier is missing (≤0) so callers don't need to guard.
 */
export function PriceTierBadge({
  tier,
  size = 'sm',
  className,
  showEmpty = true,
}: PriceTierBadgeProps) {
  const value = Number(tier ?? 0);
  if (!value || value < 1) return null;
  const clamped = Math.min(4, Math.max(1, Math.round(value)));
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 align-middle',
        className,
      )}
      aria-label={`Árkategória: ${clamped} a 4-ből`}
      title={`Árkategória: ${'$'.repeat(clamped)}`}
    >
      {Array.from({ length: 4 }).map((_, i) => {
        const active = i < clamped;
        if (!active && !showEmpty) return null;
        return (
          <DollarSign
            key={i}
            className={cn(
              iconSize,
              active ? 'text-cgi-primary' : 'text-cgi-muted-foreground/40',
            )}
            strokeWidth={2.5}
          />
        );
      })}
    </span>
  );
}
