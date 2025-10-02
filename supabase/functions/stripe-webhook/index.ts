import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Inicializa Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

// La firma secreta del webhook de Stripe
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!;

Deno.serve(async (req) => {
  console.log('=== WEBHOOK START ===');
  console.log('Webhook received at:', new Date().toISOString());
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();
  console.log('Webhook body length:', body.length);
  console.log('Stripe-Signature present:', !!signature);

  let event: Stripe.Event;

  try {
    // Verifica que el evento viene realmente de Stripe
    console.log('Verifying webhook signature...');
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      stripeWebhookSecret
    );
    console.log('Webhook signature verified successfully');
    console.log('Event type:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  
  const session = event.data.object as Stripe.Checkout.Session;
  console.log('Session mode:', session.mode);
  console.log('Session metadata:', session.metadata);

  // Crea un cliente de Supabase para interactuar con la DB
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  console.log('Supabase client created');

  try {
    // Maneja el evento 'checkout.session.completed'
    if (event.type === 'checkout.session.completed') {
      console.log('Processing checkout.session.completed event');
      
      // CASO 1: Es una suscripción
      if (session.mode === 'subscription') {
        console.log('Processing subscription payment');
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription;
        const plan = (session.metadata?.plan_name || 'basico').toLowerCase();

        if (!userId) throw new Error('User ID not found in subscription metadata.');

        console.log('Upserting subscription for user:', userId);
        const { data, error } = await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          plan: plan,
          status: 'active',
          stripe_subscription_id: subscriptionId,
        }, { onConflict: 'user_id' });
        
        if (error) {
          console.error('Subscription upsert error:', error);
          throw error;
        }
        console.log('Subscription upserted successfully:', data);
      }

      // CASO 2: Es un pago de reserva (pago único)
      if (session.mode === 'payment') {
        console.log('Processing booking payment');
        const { user_id, listing_id, start_date, end_date, total_price } = session.metadata!;
        
        console.log('Booking metadata:', { user_id, listing_id, start_date, end_date, total_price });
        
        if (!user_id || !listing_id || !start_date || !end_date || !total_price) {
          const missing = [];
          if (!user_id) missing.push('user_id');
          if (!listing_id) missing.push('listing_id');
          if (!start_date) missing.push('start_date');
          if (!end_date) missing.push('end_date');
          if (!total_price) missing.push('total_price');
          throw new Error(`Missing required booking metadata: ${missing.join(', ')}`);
        }

        const bookingData = {
          listing_id: parseInt(listing_id),
          user_id: user_id,
          start_date: start_date,
          end_date: end_date,
          total_price: parseFloat(total_price),
          deposit_paid: true,
          status: 'pending_confirmation',
        };
        
        console.log('Inserting booking with data:', bookingData);
        
        const { data, error } = await supabaseAdmin.from('bookings').insert(bookingData);
        
        if (error) {
          console.error('Booking insert error:', error);
          throw error;
        }
        
        console.log('Booking inserted successfully:', data);
      }
    } else {
      console.log('Event type not checkout.session.completed, ignoring');
    }

    console.log('=== WEBHOOK SUCCESS ===');
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error details:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    return new Response(`Webhook handler error: ${err.message}`, { status: 400 });
  }
});
