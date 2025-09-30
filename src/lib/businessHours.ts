import type { BusinessHours } from './types';

/**
 * Normalizes business hours data to ensure consistent format
 * - Converts string keys to numeric (1-7)
 * - Ensures times are zero-padded "HH:MM" format
 * - Handles both opening_hours and business_hours input
 */
export function normalizeBusinessHours(hours: any): BusinessHours | null {
  if (!hours) return null;
  
  // Detect whether hours has a byDay property or is flat with day keys at root
  const source = hours.byDay ? hours.byDay : hours;
  
  const byDay: Record<number, { open: string | null; close: string | null }> = {};
  
  // Handle both string and numeric keys
  for (const [key, value] of Object.entries(source)) {
    const numKey = parseInt(key, 10);
    if (!Number.isNaN(numKey) && numKey >= 1 && numKey <= 7) {
      const dayData = value as any;
      byDay[numKey] = {
        open: dayData?.open ? padTime(dayData.open) : null,
        close: dayData?.close ? padTime(dayData.close) : null
      };
    }
  }
  
  return {
    byDay,
    specialDates: hours.specialDates || hours.special_dates || []
  };
}

/**
 * Ensures time strings are in "HH:MM" format
 */
function padTime(timeStr: string | null): string | null {
  if (!timeStr) return null;
  
  // If already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // If in H:MM or HH:M format, pad appropriately
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  return timeStr;
}