import { Venue, FreeDrinkWindow, ActiveFreeDrinkStatus, CapUsage, BusinessHours } from './types';

const dayIndexISO = (d: Date) => {
  // Monday=1 ... Sunday=7
  const k = d.getDay(); // 0..6, Sunday=0
  return k === 0 ? 7 : k;
};

export function isVenueOpenNow(venue: Venue, now: Date): boolean {
  const bh = venue.business_hours;
  if (!bh) return false;
  const day = dayIndexISO(now);

  // specialDates take precedence
  const iso = now.toISOString().slice(0,10);
  const special = bh.specialDates?.find(s => s.date === iso);
  const open = special?.open ?? bh.byDay[day]?.open ?? null;
  const close = special?.close ?? bh.byDay[day]?.close ?? null;
  if (!open || !close) return false;

  const cur = now.toTimeString().slice(0,5); // "HH:MM"
  return open <= cur && cur <= close;
}

export function getClosingTimeToday(venue: Venue, now: Date): string | null {
  const bh = venue.business_hours;
  if (!bh) return null;
  const day = dayIndexISO(now);
  const iso = now.toISOString().slice(0,10);
  const special = bh.specialDates?.find(s => s.date === iso);
  const close = special?.close ?? bh.byDay[day]?.close ?? null;
  return close || null;
}

export function isWindowActive(window: FreeDrinkWindow, now: Date): boolean {
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayBasedDay = currentDay === 0 ? 7 : currentDay; // Convert to Monday = 1, Sunday = 7
  
  if (!window.days.includes(mondayBasedDay)) {
    return false;
  }
  
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  return currentTime >= window.start && currentTime <= window.end;
}

export function getActiveFreeDrinkStatus(venue: Venue, now: Date): ActiveFreeDrinkStatus {
  if (venue.is_paused) {
    return { isActive: false };
  }
  
  // Add null check for freeDrinkWindows
  if (!venue.freeDrinkWindows || venue.freeDrinkWindows.length === 0) {
    return { isActive: false };
  }
  
  const activeWindow = venue.freeDrinkWindows.find(window => isWindowActive(window, now));
  
  return {
    isActive: !!activeWindow,
    currentWindow: activeWindow
  };
}

export function getNextActiveWindow(venue: Venue, now: Date): FreeDrinkWindow | null {
  // Add null check for freeDrinkWindows
  if (!venue.freeDrinkWindows || venue.freeDrinkWindows.length === 0) {
    return null;
  }

  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  
  // Find next window today
  const todayWindows = venue.freeDrinkWindows.filter(window => {
    const mondayBasedDay = currentDay === 0 ? 7 : currentDay;
    return window.days.includes(mondayBasedDay) && window.start > currentTime;
  });
  
  if (todayWindows.length > 0) {
    return todayWindows.sort((a, b) => a.start.localeCompare(b.start))[0];
  }
  
  // Find next window in upcoming days
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const checkDay = ((currentDay + dayOffset - 1) % 7) + 1; // Convert to Monday = 1 system
    const adjustedDay = checkDay === 1 ? 7 : checkDay - 1; // Convert back for our system
    
    const dayWindows = venue.freeDrinkWindows.filter(window => 
      window.days.includes(adjustedDay)
    );
    
    if (dayWindows.length > 0) {
      return dayWindows.sort((a, b) => a.start.localeCompare(b.start))[0];
    }
  }
  
  return null;
}

export function calculateCapUsage(venue: Venue, redemptionsTodayCount: number): CapUsage {
  const dailyLimit = venue.caps?.daily || 0;
  
  return {
    used: redemptionsTodayCount,
    limit: dailyLimit,
    pct: dailyLimit > 0 ? (redemptionsTodayCount / dailyLimit) * 100 : 0
  };
}

export function canShowFreeDrink(venue: Venue, now: Date, redemptionsTodayCount: number): boolean {
  if (venue.is_paused) return false;
  
  const status = getActiveFreeDrinkStatus(venue, now);
  if (!status.isActive) return false;
  
  const capUsage = calculateCapUsage(venue, redemptionsTodayCount);  
  if (venue.caps?.daily && capUsage.used >= capUsage.limit) {
    return false;
  }
  
  return true;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(timeString: string): string {
  return timeString;
}

export function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
