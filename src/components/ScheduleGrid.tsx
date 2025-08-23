
import { FreeDrinkWindow } from '@/lib/types';

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
  return (
    <div className="overflow-x-auto">
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
