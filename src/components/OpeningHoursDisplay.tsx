import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { BusinessHours } from '@/lib/types';
import { isVenueOpenNow, getClosingTimeToday } from '@/lib/businessLogic';

interface VenueForStatus {
  opening_hours?: BusinessHours;
}

interface OpeningHoursDisplayProps {
  businessHours?: BusinessHours;
  venueForStatus?: VenueForStatus;
  showStatus?: boolean;
  compact?: boolean;
  className?: string;
}

const DAYS = [
  { key: 1, label: 'Hétfő', shortLabel: 'H' },
  { key: 2, label: 'Kedd', shortLabel: 'K' },
  { key: 3, label: 'Szerda', shortLabel: 'Sze' },
  { key: 4, label: 'Csütörtök', shortLabel: 'Cs' },
  { key: 5, label: 'Péntek', shortLabel: 'P' },
  { key: 6, label: 'Szombat', shortLabel: 'Szo' },
  { key: 7, label: 'Vasárnap', shortLabel: 'V' },
];

export default function OpeningHoursDisplay({ 
  businessHours, 
  venueForStatus,
  showStatus = false, 
  compact = false,
  className = ""
}: OpeningHoursDisplayProps) {
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday from 0 to 7

  const groupedHours = useMemo(() => {
    if (!businessHours?.byDay) return [];

    const groups: Array<{ days: string, hours: string, isToday: boolean }> = [];
    let currentGroup: { days: number[], hours: string } | null = null;

    DAYS.forEach(day => {
      const dayHours = businessHours.byDay[day.key];
      const hoursString = dayHours?.open && dayHours?.close 
        ? `${dayHours.open} - ${dayHours.close}`
        : 'Zárva';

      if (!currentGroup || currentGroup.hours !== hoursString) {
        if (currentGroup) {
          const dayLabels = currentGroup.days.map(d => 
            DAYS.find(day => day.key === d)?.label || ''
          );
          const daysDisplay = dayLabels.length > 2 && 
            currentGroup.days.every((d, i, arr) => i === 0 || d === arr[i-1] + 1)
            ? `${dayLabels[0]} - ${dayLabels[dayLabels.length - 1]}`
            : dayLabels.join(', ');
            
          groups.push({
            days: daysDisplay,
            hours: currentGroup.hours,
            isToday: currentGroup.days.includes(currentDay)
          });
        }
        currentGroup = { days: [day.key], hours: hoursString };
      } else {
        currentGroup.days.push(day.key);
      }
    });

    if (currentGroup) {
      const dayLabels = currentGroup.days.map(d => 
        DAYS.find(day => day.key === d)?.label || ''
      );
      const daysDisplay = dayLabels.length > 2 && 
        currentGroup.days.every((d, i, arr) => i === 0 || d === arr[i-1] + 1)
        ? `${dayLabels[0]} - ${dayLabels[dayLabels.length - 1]}`
        : dayLabels.join(', ');
        
      groups.push({
        days: daysDisplay,
        hours: currentGroup.hours,
        isToday: currentGroup.days.includes(currentDay)
      });
    }

    return groups;
  }, [businessHours, currentDay]);

  const isOpen = venueForStatus?.opening_hours ? isVenueOpenNow({ opening_hours: venueForStatus.opening_hours } as any, now) : false;
  const closingTime = venueForStatus?.opening_hours ? getClosingTimeToday({ opening_hours: venueForStatus.opening_hours } as any, now) : null;

  if (!businessHours?.byDay) {
    return (
      <div className={`text-cgi-muted-foreground ${className}`}>
        {compact ? 'Órák nem elérhetőek' : 'Nyitvatartás nem elérhető'}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Clock className="h-4 w-4" />
        {showStatus ? (
          <span className={`text-sm font-medium ${isOpen ? 'text-cgi-success' : 'text-cgi-destructive'}`}>
            {isOpen ? 'Nyitva' : 'Zárva'}
          </span>
        ) : (
          <span className="text-sm text-cgi-muted-foreground">
            {businessHours.byDay[currentDay]?.open && businessHours.byDay[currentDay]?.close
              ? `${businessHours.byDay[currentDay]?.open} - ${businessHours.byDay[currentDay]?.close}`
              : 'Zárva ma'
            }
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showStatus && (
        <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg ${
          isOpen ? 'bg-cgi-success/10 text-cgi-success' : 'bg-cgi-destructive/10 text-cgi-destructive'
        }`}>
          <Clock className="h-4 w-4" />
          <span className="font-medium">
            {isOpen ? `Nyitva${closingTime ? ` - zár ${closingTime}` : ''}` : 'Zárva'}
          </span>
        </div>
      )}
      
      <div className="space-y-2 text-sm">
        {groupedHours.map((group, index) => (
          <div 
            key={index} 
            className={`flex justify-between ${group.isToday ? 'font-medium text-cgi-primary' : ''}`}
          >
            <span className="text-cgi-surface-foreground">{group.days}</span>
            <span className={`${group.isToday ? 'text-cgi-primary' : 'text-cgi-muted-foreground'}`}>
              {group.hours}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}