import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venue_id } = await req.json();

    if (!venue_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'venue_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Fetch rewards for this venue + global rewards + partner rewards
    const { data: rewards, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('active', true)
      .gte('valid_until', today)
      .or(`venue_id.eq.${venue_id},is_global.eq.true,partner_id.eq.${venue_id}`)
      .order('priority', { ascending: false })
      .order('points_required', { ascending: true });

    if (error) {
      console.error('Error fetching rewards:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enrich partner rewards with partner venue name
    const partnerIds = [...new Set(
      rewards
        .filter(r => r.partner_id && r.partner_id !== venue_id)
        .map(r => r.venue_id)
    )];

    let venueNames: Record<string, string> = {};
    if (partnerIds.length > 0) {
      const { data: venues, error: venueError } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', partnerIds);
      
      if (!venueError && venues) {
        venueNames = Object.fromEntries(venues.map(v => [v.id, v.name]));
      }
    }

    // Also fetch the main venue name for partner rewards
    const mainVenueIds = [...new Set(
      rewards
        .filter(r => r.partner_id === venue_id && r.venue_id !== venue_id)
        .map(r => r.venue_id)
    )];

    if (mainVenueIds.length > 0) {
      const { data: mainVenues, error: mainVenueError } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', mainVenueIds);
      
      if (!mainVenueError && mainVenues) {
        mainVenues.forEach(v => {
          venueNames[v.id] = v.name;
        });
      }
    }

    // Enrich rewards with partner names
    const enrichedRewards = rewards.map(reward => ({
      ...reward,
      partner_name: reward.partner_id && reward.partner_id === venue_id 
        ? venueNames[reward.venue_id] || null
        : null
    }));

    // Check max_redemptions limits
    const rewardsWithLimit = enrichedRewards.filter(r => r.max_redemptions);
    if (rewardsWithLimit.length > 0) {
      // Filter out rewards that have reached their limit
      const availableRewards = enrichedRewards.filter(r => {
        if (!r.max_redemptions) return true;
        return (r.current_redemptions || 0) < r.max_redemptions;
      });

      return new Response(
        JSON.stringify({ success: true, rewards: availableRewards }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, rewards: enrichedRewards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
