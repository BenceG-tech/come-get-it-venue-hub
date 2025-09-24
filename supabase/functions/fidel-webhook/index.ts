
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FidelWebhookEvent {
  id: string
  accountId: string
  programId: string
  type: string
  created: string
  live: boolean
  data: {
    id: string
    accountId: string
    programId: string
    brandId?: string
    locationId?: string
    userId?: string
    cardId: string
    amount: number
    currency: string
    authCode?: string
    cleared: boolean
    created: string
    updated: string
    datetime: string
    merchantName?: string
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Fidel webhook received:', req.method)

    // Verify the webhook signature
    const signature = req.headers.get('fidel-signature')
    const timestamp = req.headers.get('fidel-timestamp')
    
    if (!signature || !timestamp) {
      console.error('Missing signature or timestamp headers')
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      })
    }

    const body = await req.text()
    console.log('Webhook body:', body)

    // Verify signature using the webhook signing secret
    const signingSecret = Deno.env.get('FIDEL_WEBHOOK_SIGNING_SECRET')
    if (!signingSecret) {
      console.error('FIDEL_WEBHOOK_SIGNING_SECRET not configured')
      return new Response('Server configuration error', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    // Create HMAC signature for verification
    const encoder = new TextEncoder()
    const keyData = encoder.encode(signingSecret)
    const messageData = encoder.encode(timestamp + body)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (signature !== computedSignature) {
      console.error('Invalid webhook signature')
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      })
    }

    // Parse the webhook event
    const event: FidelWebhookEvent = JSON.parse(body)
    console.log('Parsed event:', event)

    // Initialize Supabase client with service role key
    const supabaseUrl = 'https://nrxfiblssxwzeziomlvc.supabase.co'
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!serviceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured')
      return new Response('Server configuration error', { 
        status: 500,
        headers: corsHeaders 
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Handle different event types
    switch (event.type) {
      case 'transaction.auth':
      case 'transaction.clearing':
        await handleTransaction(supabase, event)
        break
      
      case 'card.linked':
        await handleCardLinked(supabase, event)
        break
        
      case 'card.failed':
        console.log('Card linking failed:', event.data)
        break
        
      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleTransaction(supabase: any, event: FidelWebhookEvent) {
  console.log('Processing transaction:', event.data.id)
  
  try {
    // Find the venue associated with this Fidel location
    const { data: venueLocation, error: locationError } = await supabase
      .from('venue_locations')
      .select('venue_id, scheme')
      .eq('fidel_location_id', event.data.locationId)
      .single()

    if (locationError) {
      console.error('Venue location not found:', event.data.locationId)
      return
    }

    // Find the user associated with this card
    const { data: linkedCard, error: cardError } = await supabase
      .from('linked_cards')
      .select('user_id, program_id')
      .eq('fidel_card_id', event.data.cardId)
      .single()

    if (cardError) {
      console.error('Linked card not found:', event.data.cardId)
      return
    }

    // Store the Fidel transaction
    const { error: insertError } = await supabase
      .from('fidel_transactions')
      .insert({
        fidel_transaction_id: event.data.id,
        fidel_card_id: event.data.cardId,
        fidel_location_id: event.data.locationId,
        user_id: linkedCard.user_id,
        venue_id: venueLocation.venue_id,
        amount: event.data.amount, // Amount in cents
        currency: event.data.currency,
        cleared: event.data.cleared,
        transaction_date: event.data.datetime,
        auth_code: event.data.authCode,
        merchant_name: event.data.merchantName,
        raw_payload: event,
        processed_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to insert transaction:', insertError)
      return
    }

    // Calculate points (1 point per 100 HUF spent)
    const pointsAwarded = Math.floor(event.data.amount / 100)

    if (pointsAwarded > 0) {
      // Update the transaction with points
      const { error: updateError } = await supabase
        .from('fidel_transactions')
        .update({ points_awarded: pointsAwarded })
        .eq('fidel_transaction_id', event.data.id)

      if (updateError) {
        console.error('Failed to update points:', updateError)
      }
    }

    console.log(`Transaction processed: ${event.data.id}, points awarded: ${pointsAwarded}`)

  } catch (error) {
    console.error('Transaction processing error:', error)
  }
}

async function handleCardLinked(supabase: any, event: FidelWebhookEvent) {
  console.log('Processing card linked:', event.data.cardId)
  
  try {
    // The card linking should have been initiated by our frontend
    // This webhook confirms the card was successfully linked
    const { error: updateError } = await supabase
      .from('linked_cards')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('fidel_card_id', event.data.cardId)

    if (updateError) {
      console.error('Failed to update linked card status:', updateError)
    } else {
      console.log('Card linking confirmed:', event.data.cardId)
    }

  } catch (error) {
    console.error('Card linking processing error:', error)
  }
}
