// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crea un cliente de Supabase para obtener los datos del usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Obtiene el usuario a partir del token JWT de la petición
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not found.');
    }

    const { planType, planName } = await req.json();
    if (!planType || !planName) {
      throw new Error('planType and planName are required.');
    }

    // Map product IDs to price IDs for subscriptions
    const PLAN_PRICE_IDS = {
      'básico': 'prod_SrhgM76Jw1lKcn',
      'premium': 'prod_SrhhsvazdNDKRG', 
      'diamante': 'prod_Srhhbxz0I6mEs5'
    };

    const priceId = PLAN_PRICE_IDS[planType as keyof typeof PLAN_PRICE_IDS];
    if (!priceId) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL')}/payment/success?type=subscription`,
      cancel_url: `${Deno.env.get('SITE_URL')}/membership`,
      // ¡Aquí está la magia! Pasamos el ID del usuario y el nombre del plan a Stripe
      metadata: {
        user_id: user.id,
        plan_name: planName,
      }
    });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-checkout-session' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
