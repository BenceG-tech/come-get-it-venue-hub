// Keep the native and Edge Function schedule policy aligned. The release tests run
// the same business cases against this module and expo/lib/offerAvailability.ts.
export const VENUE_TIME_ZONE = 'Europe/Budapest';
type AvailabilityState = 'available' | 'unavailable' | 'unknown';
type FreeDrinkWindow = {
  days?: number[];
  dayOfWeek?: number;
  start: string;
  end: string;
  timezone?: string;
};

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const formatters = new Map<string, Intl.DateTimeFormat>();

function localClock(now: Date, timeZone: string): { day: number; minute: number } | null {
  try {
    let formatter = formatters.get(timeZone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      formatters.set(timeZone, formatter);
    }
    const parts = formatter.formatToParts(now);
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(part('weekday')) + 1;
    const minute = Number(part('hour')) * 60 + Number(part('minute'));
    return day > 0 && Number.isFinite(minute) ? { day, minute } : null;
  } catch {
    return null;
  }
}

/** Supports HH, HH:mm and PostgreSQL HH:mm:ss; 24:00 is valid only as an end. */
function minuteOfDay(value: unknown, end = false): number | null {
  if (typeof value !== 'string' || !/^\d{1,2}(?::\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(value)) return null;
  const [hour, minute = 0, second = 0] = value.split(':').map(Number);
  if (end && hour === 24 && minute === 0 && second === 0) return 1440;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second >= 60) return null;
  return hour * 60 + minute + second / 60;
}

function activeInterval(days: number[], start: number, end: number, day: number, minute: number): boolean {
  if (start === end) return false; // Zero-length/ambiguous intervals do not advertise an offer.
  if (end > start) return days.includes(day) && minute >= start && minute < end;
  const previousDay = day === 1 ? 7 : day - 1;
  return (days.includes(day) && minute >= start) || (days.includes(previousDay) && minute < end);
}

export function getWindowAvailability(window: FreeDrinkWindow, now = new Date()): AvailabilityState {
  const clock = localClock(now, window.timezone || VENUE_TIME_ZONE);
  const start = minuteOfDay(window.start);
  const end = minuteOfDay(window.end, true);
  const days = window.days ?? (typeof window.dayOfWeek === 'number' ? [window.dayOfWeek + 1] : []);
  if (!clock || start === null || end === null || days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return 'unknown';
  return activeInterval(days, start, end, clock.day, clock.minute) ? 'available' : 'unavailable';
}

/** Opening hours belong to the venue's local day, including yesterday's overnight period. */
export function getVenueOpeningState(openingHours: unknown, now = new Date()): AvailabilityState {
  let hours = openingHours;
  if (typeof hours === 'string') {
    try { hours = JSON.parse(hours); } catch { return 'unknown'; }
  }
  if (!hours || typeof hours !== 'object') return 'unknown';
  const record = hours as Record<string, unknown>;
  const clock = localClock(now, VENUE_TIME_ZONE);
  if (!clock) return 'unknown';
  const byDay = record.byDay && typeof record.byDay === 'object' ? record.byDay as Record<string, unknown> : null;
  const recognized = byDay ? Object.keys(byDay).some((key) => /^[1-7]$/.test(key)) : dayNames.some((day) => day in record);
  if (!recognized) return 'unknown';
  let hasUnknown = false;
  const previousDay = clock.day === 1 ? 7 : clock.day - 1;
  for (const day of [clock.day, previousDay]) {
    const value = byDay ? byDay[String(day)] : record[dayNames[day - 1]];
    if (value == null) continue; // In the saved schedule, omitted days are closed.
    if (typeof value !== 'object') { hasUnknown = true; continue; }
    const interval = value as Record<string, unknown>;
    if (interval.closed === true) continue;
    const start = minuteOfDay(interval.open);
    const end = minuteOfDay(interval.close, true);
    if (start === null || end === null || start === end) { hasUnknown = true; continue; }
    if (activeInterval([day], start, end, clock.day, clock.minute)) return 'available';
  }
  return hasUnknown ? 'unknown' : 'unavailable';
}
