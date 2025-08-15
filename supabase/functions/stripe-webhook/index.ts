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
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    // Verifica que el evento viene realmente de Stripe
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      stripeWebhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  
  const session = event.data.object as Stripe.Checkout.Session;

  // Crea un cliente de Supabase para interactuar con la DB
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Maneja el evento 'checkout.session.completed'
    if (event.type === 'checkout.session.completed') {
      
      // CASO 1: Es una suscripción
      if (session.mode === 'subscription') {
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription;
        const plan = (session.metadata?.plan_name || 'basico').toLowerCase();

        if (!userId) throw new Error('User ID not found in subscription metadata.');

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          plan: plan,
          status: 'active',
          stripe_subscription_id: subscriptionId,
        }, { onConflict: 'user_id' });
      }

      // CASO 2: Es un pago de reserva (pago único)
      if (session.mode === 'payment') {
        const { user_id, listing_id, start_date, end_date, total_price } = session.metadata!;
        
        if (!user_id || !listing_id || !start_date || !end_date || !total_price) {
          throw new Error('Missing required booking metadata.');
        }

        await supabaseAdmin.from('bookings').insert({
          listing_id: parseInt(listing_id),
          user_id: user_id,
          start_date: start_date,
          end_date: end_date,
          total_price: parseFloat(total_price),
          deposit_paid: true, // El pago del depósito fue exitoso
          status: 'confirmed', // Reserva confirmada
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return new Response(`Webhook handler error: ${err.message}`, { status: 400 });
  }
});
