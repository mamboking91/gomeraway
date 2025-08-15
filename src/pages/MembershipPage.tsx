import React, { useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';

const MembershipPage = () => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  // Mapeamos los nombres de los planes a sus IDs de precio de Stripe desde .env.local
  const priceIds: { [key: string]: string } = {
    Básico: import.meta.env.VITE_STRIPE_BASIC_PRICE_ID,
    Premium: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID,
    Diamante: import.meta.env.VITE_STRIPE_DIAMANTE_PRICE_ID,
  };

  const plans = [
    {
      name: 'Básico',
      price: '10€',
      period: '/mes',
      description: 'Ideal para empezar a obtener visibilidad en La Gomera.',
      features: [
        'Hasta 1 anuncio activo',
        'Soporte por email',
        'Estadísticas básicas',
      ],
      isPopular: false,
    },
    {
      name: 'Premium',
      price: '25€',
      period: '/mes',
      description: 'Maximiza tu alcance y gestiona más propiedades o vehículos.',
      features: [
        'Hasta 5 anuncios activos',
        'Soporte prioritario por email',
        'Estadísticas avanzadas',
        'Posicionamiento destacado',
      ],
      isPopular: true,
    },
    {
      name: 'Diamante',
      price: '50€',
      period: '/mes',
      description: 'La solución completa para profesionales y agencias.',
      features: [
        'Anuncios ilimitados',
        'Soporte 24/7 por teléfono y email',
        'Todas las estadísticas',
        'Máximo posicionamiento',
        'Gestor de cuenta personal',
      ],
      isPopular: false,
    },
  ];

  // Función para manejar la suscripción
  const handleSubscription = async (planName: string) => {
    setIsLoading(true);

    // 1. Comprobar si el usuario está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Por favor, inicia sesión para suscribirte.");
      // Aquí podrías redirigir a una página de login en el futuro
      setIsLoading(false);
      return;
    }

    const priceId = priceIds[planName];
    if (!priceId) {
      alert("Error: ID de precio no encontrado.");
      setIsLoading(false);
      return;
    }

    // 2. Invocar la función con el priceId Y el planName
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId, planName },
    });

    if (error) {
      alert(`Error: ${error.message}`);
      setIsLoading(false);
      return;
    }

    // Redirigimos al usuario a la URL de checkout de Stripe
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Elige tu Plan de Anfitrión
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Conviértete en anfitrión en GomeraWay y empieza a monetizar tus propiedades y vehículos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'rounded-2xl p-8 border transition-all duration-300 flex flex-col',
                plan.isPopular ? 'border-primary shadow-strong' : 'bg-gradient-card shadow-soft'
              )}
            >
              {plan.isPopular && (
                <div className="text-center mb-4">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Más Popular
                  </span>
                </div>
              )}
              <h2 className="text-2xl font-bold text-center mb-2">{plan.name}</h2>
              <p className="text-muted-foreground text-center mb-6 h-12">{plan.description}</p>
              
              <div className="text-center mb-8">
                <span className="text-5xl font-extrabold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                onClick={() => handleSubscription(plan.name)}
                disabled={isLoading}
                className={cn(
                  'w-full text-lg py-3 rounded-xl',
                  plan.isPopular ? 'bg-gradient-primary hover:opacity-90' : 'bg-secondary hover:bg-secondary/90'
                )}
              >
                {isLoading ? 'Cargando...' : 'Suscribirse'}
              </Button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MembershipPage;
