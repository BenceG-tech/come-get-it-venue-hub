
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
}

const BUDAPEST_TIME_ZONE = 'Europe/Budapest'

type DayHours = { open?: string; close?: string }

function getDayHours(openingHours: unknown, day: string): DayHours | undefined {
  if (!openingHours || typeof openingHours !== 'object') return undefined
  const byDay = (openingHours as Record<string, unknown>).byDay
  if (!byDay || typeof byDay !== 'object') return undefined
  const value = (byDay as Record<string, unknown>)[day]
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  return {
    open: typeof record.open === 'string' ? record.open : undefined,
    close: typeof record.close === 'string' ? record.close : undefined,
  }
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, 'Content-Type': 'application/json' },
  })
}

function clampLimit(rawValue: string | null): number {
  const normalized = rawValue?.trim()
  if (!normalized || !/^\d+$/.test(normalized)) return 50
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 50
}

function parseCoordinate(rawValue: string | null): number | null {
  const normalized = rawValue?.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function sanitizeSearchTerm(rawValue: string | null): string {
  return (rawValue ?? '')
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\s.'’-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function budapestClock(now = new Date()): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUDAPEST_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const dayMap: Record<string, string> = {
    Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5', Sat: '6', Sun: '7',
  }
  return {
    day: dayMap[values.weekday] ?? '1',
    minutes: Number(values.hour) * 60 + Number(values.minute),
  }
}

function computeOpenStatus(openingHours: unknown, currentDay: string, currentMinutes: number) {
  const today = getDayHours(openingHours, currentDay)
  const openStatus = {
    is_open_now: false,
    closes_at: null as string | null,
    hours_today: today?.open && today?.close
      ? { open: today.open as string, close: today.close as string }
      : null,
  }

  const todayOpen = parseTimeToMinutes(today?.open)
  const todayClose = parseTimeToMinutes(today?.close)
  if (todayOpen != null && todayClose != null) {
    const isOpenToday = todayOpen === todayClose
      || (todayClose > todayOpen
        ? currentMinutes >= todayOpen && currentMinutes <= todayClose
        : currentMinutes >= todayOpen)
    if (isOpenToday) {
      openStatus.is_open_now = true
      openStatus.closes_at = today.close
      return openStatus
    }
  }

  const previousDay = currentDay === '1' ? '7' : String(Number(currentDay) - 1)
  const previous = getDayHours(openingHours, previousDay)
  const previousOpen = parseTimeToMinutes(previous?.open)
  const previousClose = parseTimeToMinutes(previous?.close)
  if (
    previousOpen != null
    && previousClose != null
    && previousClose < previousOpen
    && currentMinutes <= previousClose
  ) {
    openStatus.is_open_now = true
    openStatus.closes_at = previous.close
  }

  return openStatus
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const searchTerm = sanitizeSearchTerm(url.searchParams.get('search'))
    const limitCount = clampLimit(url.searchParams.get('limit'))
    const sortMode = (url.searchParams.get('sort') || 'default').toLowerCase()
    const userLatRaw = url.searchParams.get('lat')
    const userLngRaw = url.searchParams.get('lng')
    const userLat = parseCoordinate(userLatRaw)
    const userLng = parseCoordinate(userLngRaw)
    const useDistance = sortMode === 'distance'
      && userLat != null
      && userLng != null
      && Number.isFinite(userLat)
      && Number.isFinite(userLng)
      && userLat >= -90
      && userLat <= 90
      && userLng >= -180
      && userLng <= 180

    console.log('[get-public-venues] Fetching venues', { hasSearch: searchTerm.length > 0, limitCount })

    // Fetch all active venues with opening_hours
    let query = supabaseClient
      .from('venues')
      .select(`
        id, name, address, description, plan, phone_number, 
        website_url, image_url, hero_image_url, is_paused, 
        created_at, tags, opening_hours, participates_in_points, 
        points_per_visit, distance, coordinates, formatted_address,
        google_maps_url, category, price_tier, rating, display_order
      `)
      .eq('is_paused', false)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limitCount)

    // Apply search filter if provided
    if (searchTerm && searchTerm.trim() !== '') {
      query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
    }

    const { data: venues, error: venuesError } = await query

    if (venuesError) {
      console.error('[get-public-venues] venuesError', venuesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch venues' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!venues || venues.length === 0) {
      console.log('[get-public-venues] No venues found')
      return new Response(
        JSON.stringify([]),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[get-public-venues] Found ${venues.length} venues, computing open status...`)

    // Helper function to group consecutive days with same hours
    const groupOpeningHours = (openingHours: unknown) => {
      if (!openingHours || typeof openingHours !== 'object') return [];
      
      const DAYS = [
        { key: '1', label: 'Hétfő' },
        { key: '2', label: 'Kedd' },
        { key: '3', label: 'Szerda' },
        { key: '4', label: 'Csütörtök' },
        { key: '5', label: 'Péntek' },
        { key: '6', label: 'Szombat' },
        { key: '7', label: 'Vasárnap' }
      ];

      const groups: { days: string; hours: string }[] = [];
      let currentGroup: { dayKeys: string[]; dayLabels: string[]; hours: string } | null = null;

      for (const day of DAYS) {
        const dayHours = getDayHours(openingHours, day.key);
        const hoursText = dayHours?.open && dayHours?.close 
          ? `${dayHours.open} - ${dayHours.close}`
          : 'Zárva';

        if (currentGroup && currentGroup.hours === hoursText) {
          currentGroup.dayKeys.push(day.key);
          currentGroup.dayLabels.push(day.label);
        } else {
          if (currentGroup) {
            const daysText = currentGroup.dayLabels.length === 1
              ? currentGroup.dayLabels[0]
              : `${currentGroup.dayLabels[0]} - ${currentGroup.dayLabels[currentGroup.dayLabels.length - 1]}`;
            groups.push({ days: daysText, hours: currentGroup.hours });
          }
          currentGroup = {
            dayKeys: [day.key],
            dayLabels: [day.label],
            hours: hoursText
          };
        }
      }

      if (currentGroup) {
        const daysText = currentGroup.dayLabels.length === 1
          ? currentGroup.dayLabels[0]
          : `${currentGroup.dayLabels[0]} - ${currentGroup.dayLabels[currentGroup.dayLabels.length - 1]}`;
        groups.push({ days: daysText, hours: currentGroup.hours });
      }

      return groups;
    };

    // Compute opening status for each venue
    const { day: currentDay, minutes: currentMinutes } = budapestClock()

    const venuesWithStatus = venues.map(venue => {
      const business_hours = venue.opening_hours || null;
      const open_status = computeOpenStatus(business_hours, currentDay, currentMinutes)

      const hours_summary = groupOpeningHours(business_hours);

      return {
        ...venue,
        business_hours, // Alias for opening_hours
        open_status,
        hours_summary,
        timezone: BUDAPEST_TIME_ZONE
      };
    });

    // Optional distance sorting (Haversine)
    let finalVenues: Array<(typeof venuesWithStatus)[number] & { distance_km?: number | null }> = venuesWithStatus;
    if (useDistance) {
      const toRad = (d: number) => (d * Math.PI) / 180;
      const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
      };

      finalVenues = venuesWithStatus.map((v) => {
        const c = v.coordinates as { lat?: number; lng?: number } | null;
        const lat = c?.lat;
        const lng = c?.lng;
        const distance_km = (lat != null && lng != null && !(lat === 0 && lng === 0))
          ? Math.round(haversineKm(userLat!, userLng!, lat, lng) * 100) / 100
          : null;
        return { ...v, distance_km };
      }).sort((a, b) => {
        if (a.distance_km == null && b.distance_km == null) return 0;
        if (a.distance_km == null) return 1;
        if (b.distance_km == null) return -1;
        return a.distance_km - b.distance_km;
      });
      console.log('[get-public-venues] Applied distance sort')
    }

    const sortModeLabel = useDistance ? 'distance' : 'default'
    console.log(`[get-public-venues] Returning ${finalVenues.length} venues (sort=${sortModeLabel})`)

    return new Response(
      JSON.stringify(finalVenues),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Sort-Mode': sortModeLabel,
          'X-Venue-Count': String(finalVenues.length),
        }
      }
    )

  } catch (error) {
    console.error('[get-public-venues] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
