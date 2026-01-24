import { Badge } from '@/components/ui/badge';
import { Zap, CreditCard, Users, Building2 } from 'lucide-react';
import { VenueIntegrationType } from '@/lib/types';

interface IntegrationTypeBadgeProps {
  type: VenueIntegrationType;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const INTEGRATION_CONFIG: Record<VenueIntegrationType, {
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  goorderz: {
    label: 'Goorderz POS',
    shortLabel: 'POS',
    icon: Zap,
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
  },
  saltedge: {
    label: 'Salt Edge',
    shortLabel: 'Bank',
    icon: CreditCard,
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  },
  manual: {
    label: 'Manuális',
    shortLabel: 'Manual',
    icon: Users,
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
  },
  none: {
    label: 'Nincs',
    shortLabel: 'N/A',
    icon: Building2,
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30',
  },
};

export function IntegrationTypeBadge({ type, showLabel = true, size = 'sm' }: IntegrationTypeBadgeProps) {
  const config = INTEGRATION_CONFIG[type] || INTEGRATION_CONFIG.none;
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'}`}
    >
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} ${showLabel ? 'mr-1' : ''}`} />
      {showLabel && (size === 'sm' ? config.shortLabel : config.label)}
    </Badge>
  );
}
