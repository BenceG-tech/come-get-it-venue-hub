
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
        created_at, tags, opening_hours
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

    // Add images to venue object
    const venueWithImages = {
      ...venue,
      images: (images || []).map(img => ({
        id: img.id,
        url: img.url,
        label: img.label || '',
        isCover: !!img.is_cover
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
