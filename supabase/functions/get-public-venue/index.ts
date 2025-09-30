
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Support both GET (query param) and POST (JSON body) styles for passing the venue ID
    let venueId = url.searchParams.get('id')

    if (!venueId && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      try {
        const body = await req.json()
        venueId = body?.id || body?.venueId || body?.venue_id || null
      } catch (_e) {
        // No valid JSON body; will fall through to missing ID handling
      }
    }

    if (!venueId) {
      return new Response(
        JSON.stringify({ error: 'Venue ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[get-public-venue] Fetching venue', { method: req.method, venueId })

    // Fetch venue with all related data using service role to bypass RLS
    const { data: venue, error: venueError } = await supabaseClient
      .from('venues')
      .select(`
        id, name, address, description, plan, phone_number, 
        website_url, image_url, hero_image_url, is_paused, 
        created_at, tags, opening_hours, participates_in_points, points_per_visit, distance,
        coordinates, formatted_address, google_maps_url, category, price_tier, rating
      `)
      .eq('id', venueId)
      .eq('is_paused', false)
      .maybeSingle()

    if (venueError) {
      console.error('[get-public-venue] venueError', venueError)
    }

    if (!venue) {
      return new Response(
        JSON.stringify({ error: 'Venue not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch venue images
    const { data: images, error: imgsErr } = await supabaseClient
      .from('venue_images')
      .select('id, url, label, is_cover, created_at')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: true })

    if (imgsErr) {
      console.warn('[get-public-venue] images fetch warning', imgsErr)
    }

    // Fetch venue drinks
    const { data: drinks, error: drinksErr } = await supabaseClient
      .from('venue_drinks')
      .select(`
        id, drink_name, category, is_free_drink, is_sponsored, 
        brand_id, description, ingredients, image_url, 
        serving_style, abv
      `)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: true })

    if (drinksErr) {
      console.warn('[get-public-venue] drinks fetch warning', drinksErr)
    }

    // Fetch free drink windows
    const { data: freeDrinkWindows, error: windowsErr } = await supabaseClient
      .from('free_drink_windows')
      .select(`
        id, drink_id, days, start_time, end_time, timezone
      `)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: true })

    if (windowsErr) {
      console.warn('[get-public-venue] windows fetch warning', windowsErr)
    }

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

    // Compute opening status and hours summary
    const now = new Date();
    const currentDay = ((now.getDay()) || 7).toString(); // Sunday = 7
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
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

    // Add images, drinks, windows, and computed opening hours data to venue object
    const venueWithImages = {
      ...venue,
      business_hours, // Alias for opening_hours
      open_status,
      hours_summary,
      timezone: 'Europe/Budapest',
      images: (images || []).map(img => ({
        id: img.id,
        url: img.url,
        label: img.label || '',
        isCover: !!img.is_cover
      })),
      drinks: (drinks || []).map(drink => ({
        id: drink.id,
        drinkName: drink.drink_name,
        category: drink.category,
        is_free_drink: drink.is_free_drink,
        is_sponsored: drink.is_sponsored,
        brand_id: drink.brand_id,
        description: drink.description,
        ingredients: drink.ingredients,
        image_url: drink.image_url,
        serving_style: drink.serving_style,
        abv: drink.abv
      })),
      freeDrinkWindows: (freeDrinkWindows || []).map(window => ({
        id: window.id,
        drink_id: window.drink_id,
        days: window.days,
        start: window.start_time,
        end: window.end_time,
        timezone: window.timezone
      }))
    }

    return new Response(
      JSON.stringify(venueWithImages),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error fetching public venue:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
