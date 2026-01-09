import { FreeDrinkWindow } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ScheduleGridMobile from './ScheduleGridMobile';

export const days = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
const hours = Array.from({ length: 24 }, (_, i) => i); // 0..23

function cellActive(windows: FreeDrinkWindow[], dayISO: number, hour: number) {
  // simplified: if any window contains the given dayISO + hour
  return windows.some(w => 
    w.days.includes(dayISO) && 
    Number(w.start.slice(0,2)) <= hour && 
    hour < Number(w.end.slice(0,2))
  );
}

export default function ScheduleGrid({ windows }: { windows: FreeDrinkWindow[] }) {
  const isMobile = useIsMobile();

  // On mobile, show a simplified list view
  if (isMobile) {
    return <ScheduleGridMobile windows={windows} />;
  }

  return (
    <div className="overflow-x-auto" data-tour="schedule-grid">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-cgi-surface-foreground">Heti ütemterv</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-cgi-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>A kiemelt cellák jelzik, mikor érhető el az ingyenes ital. A sorok a napokat (H-V), az oszlopok az órákat (0-23) jelölik.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `80px repeat(24, 1fr)` }}>
        <div />
        {hours.map(h => (
          <div key={h} className="text-[10px] text-center text-cgi-muted-foreground">{h}</div>
        ))}
        {days.map((d, idx) => (
          <div key={d} className="contents">
            <div className="text-xs text-right pr-2 text-cgi-muted-foreground">{d}</div>
            {hours.map(h => (
              <div
                key={`${idx+1}-${h}`}
                className="h-4 border border-cgi-muted/20"
                style={{ 
                  backgroundColor: cellActive(windows, idx + 1, h) 
                    ? 'rgba(6, 182, 212, 0.6)' 
                    : 'transparent' 
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
