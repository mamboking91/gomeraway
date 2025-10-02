// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan limits configuration
const PLAN_LIMITS = {
  'básico': 1,
  'basico': 1,
  'premium': 5,
  'diamante': -1, // -1 means unlimited
} as const;

interface LimitsCheckResult {
  canCreate: boolean;
  currentCount: number;
  maxAllowed: number;
  planName: string;
  isUnlimited: boolean;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('Checking listing limits for user:', user.id);

    // 1. Get user's current subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching subscription:', subError);
      throw new Error('Error checking subscription status');
    }

    // Default to no plan if no active subscription found
    const planName = subscription?.plan?.toLowerCase() || 'none';
    console.log('User plan:', planName);

    // 2. If no active subscription, they can't create listings
    if (!subscription || subscription.status !== 'active') {
      const result: LimitsCheckResult = {
        canCreate: false,
        currentCount: 0,
        maxAllowed: 0,
        planName: 'none',
        isUnlimited: false,
        message: 'Se requiere una suscripción activa para crear anuncios. ¡Suscríbete para empezar!'
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get plan limits
    const maxAllowed = PLAN_LIMITS[planName as keyof typeof PLAN_LIMITS] ?? 0;
    const isUnlimited = maxAllowed === -1;

    // 4. Count current active listings
    const { data: listings, error: listingsError } = await supabaseClient
      .from('listings')
      .select('id')
      .eq('host_id', user.id)
      .eq('is_active', true);

    if (listingsError) {
      console.error('Error counting listings:', listingsError);
      throw new Error('Error checking current listings');
    }

    const currentCount = listings?.length || 0;
    console.log(`Current active listings: ${currentCount}, Max allowed: ${maxAllowed}`);

    // 5. Determine if user can create more listings
    const canCreate = isUnlimited || currentCount < maxAllowed;

    const result: LimitsCheckResult = {
      canCreate,
      currentCount,
      maxAllowed: isUnlimited ? 999 : maxAllowed, // Display 999 for unlimited
      planName: subscription.plan,
      isUnlimited,
      message: canCreate 
        ? undefined 
        : `Has alcanzado el límite de ${maxAllowed} anuncio${maxAllowed !== 1 ? 's' : ''} para tu plan ${subscription.plan}. ¡Mejora tu plan para crear más anuncios!`
    };

    console.log('Limits check result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-listing-limits:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        canCreate: false,
        currentCount: 0,
        maxAllowed: 0,
        planName: 'error',
        isUnlimited: false
      }), 
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});