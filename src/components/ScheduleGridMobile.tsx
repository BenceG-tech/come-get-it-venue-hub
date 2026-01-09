import { FreeDrinkWindow } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface ScheduleGridMobileProps {
  windows: FreeDrinkWindow[];
}

const fullDayNames = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

function getActiveRangesForDay(windows: FreeDrinkWindow[], dayISO: number): string[] {
  const ranges: string[] = [];
  
  // Find all windows active on this day
  const activeWindows = windows.filter(w => w.days.includes(dayISO));
  
  // Collect time ranges
  activeWindows.forEach(w => {
    ranges.push(`${w.start} - ${w.end}`);
  });
  
  return ranges;
}

export default function ScheduleGridMobile({ windows }: ScheduleGridMobileProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-cgi-surface-foreground">Heti ütemterv</span>
      <div className="space-y-2">
        {fullDayNames.map((day, idx) => {
          const dayISO = idx + 1;
          const activeRanges = getActiveRangesForDay(windows, dayISO);
          const hasActivity = activeRanges.length > 0;
          
          return (
            <Card 
              key={day} 
              className={`p-3 ${hasActivity ? 'bg-cgi-primary/10 border-cgi-primary/30' : 'bg-cgi-muted/20 border-cgi-muted'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-cgi-surface-foreground">{day}</span>
                <div className="flex items-center gap-2">
                  {hasActivity ? (
                    <>
                      <Clock className="h-4 w-4 text-cgi-primary" />
                      <span className="text-sm text-cgi-primary font-medium">
                        {activeRanges.join(', ')}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-cgi-muted-foreground">Nincs</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
