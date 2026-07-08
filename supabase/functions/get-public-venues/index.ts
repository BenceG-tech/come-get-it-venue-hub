
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const searchTerm = url.searchParams.get('search') || ''
    const limitCount = parseInt(url.searchParams.get('limit') || '50')
    const sortMode = (url.searchParams.get('sort') || 'default').toLowerCase()
    const userLatRaw = url.searchParams.get('lat')
    const userLngRaw = url.searchParams.get('lng')
    const userLat = userLatRaw != null ? parseFloat(userLatRaw) : null
    const userLng = userLngRaw != null ? parseFloat(userLngRaw) : null
    const useDistance = sortMode === 'distance' && userLat != null && userLng != null && !isNaN(userLat) && !isNaN(userLng)

    console.log('[get-public-venues] Fetching venues', { searchTerm, limitCount })

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

    // Helper function to parse HH:MM to minutes
    const parseTimeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Helper function to group consecutive days with same hours
    const groupOpeningHours = (openingHours: any) => {
      if (!openingHours?.byDay) return [];
      
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
        const dayHours = openingHours.byDay[day.key];
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
    const now = new Date();
    const currentDay = ((now.getDay()) || 7).toString(); // Sunday = 7, Monday = 1
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const venuesWithStatus = venues.map(venue => {
      const business_hours = venue.opening_hours || null;
      let open_status = {
        is_open_now: false,
        closes_at: null as string | null,
        hours_today: null as { open: string; close: string } | null
      };

      if (business_hours?.byDay?.[currentDay]) {
        const todayHours = business_hours.byDay[currentDay];
        if (todayHours.open && todayHours.close) {
          const openMinutes = parseTimeToMinutes(todayHours.open);
          const closeMinutes = parseTimeToMinutes(todayHours.close);
          
          open_status.hours_today = {
            open: todayHours.open,
            close: todayHours.close
          };
          
          // Check if currently open
          if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
            open_status.is_open_now = true;
            open_status.closes_at = todayHours.close;
          }
        }
      }

      const hours_summary = groupOpeningHours(business_hours);

      return {
        ...venue,
        business_hours, // Alias for opening_hours
        open_status,
        hours_summary,
        timezone: 'Europe/Budapest'
      };
    });

    // Optional distance sorting (Haversine)
    let finalVenues: any[] = venuesWithStatus;
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

      finalVenues = venuesWithStatus.map((v: any) => {
        const c = v.coordinates as { lat?: number; lng?: number } | null;
        const lat = c?.lat;
        const lng = c?.lng;
        const distance_km = (lat != null && lng != null && !(lat === 0 && lng === 0))
          ? Math.round(haversineKm(userLat!, userLng!, lat, lng) * 100) / 100
          : null;
        return { ...v, distance_km };
      }).sort((a: any, b: any) => {
        if (a.distance_km == null && b.distance_km == null) return 0;
        if (a.distance_km == null) return 1;
        if (b.distance_km == null) return -1;
        return a.distance_km - b.distance_km;
      });
      console.log(`[get-public-venues] Sorted by distance from (${userLat}, ${userLng})`);
    }

    const sortModeLabel = useDistance ? 'distance' : 'default'
    console.log(`[get-public-venues] Returning ${finalVenues.length} venues (sort=${sortModeLabel}) — first 5:`,
      finalVenues.slice(0, 5).map((v: any) => `${v.display_order ?? '?'}:${v.name}`).join(' | '))

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
