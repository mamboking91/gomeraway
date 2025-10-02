import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, Zap, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface SubscriptionUpgradeProps {
  currentPlan: string;
  userId: string;
  onUpgradeComplete?: () => void;
}

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    icon: <Star className="h-5 w-5" />,
    price: 'Gratis',
    listings: 3,
    photos: 5,
    features: ['3 anuncios', '5 fotos por anuncio', 'Soporte básico'],
    color: 'bg-gray-100',
    buttonColor: 'bg-gray-600'
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: <Crown className="h-5 w-5" />,
    price: '9.99€/mes',
    listings: 10,
    photos: 15,
    features: ['10 anuncios', '15 fotos por anuncio', 'Destacado en búsquedas', 'Analytics básicos', 'Soporte prioritario'],
    color: 'bg-blue-100',
    buttonColor: 'bg-blue-600',
    popular: true
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: <Zap className="h-5 w-5" />,
    price: '19.99€/mes',
    listings: -1,
    photos: 30,
    features: ['Anuncios ilimitados', '30 fotos por anuncio', 'Posición premium', 'Analytics avanzados', 'Gestión de múltiples propiedades', 'Soporte 24/7'],
    color: 'bg-purple-100',
    buttonColor: 'bg-purple-600'
  }
];

const SubscriptionUpgrade: React.FC<SubscriptionUpgradeProps> = ({ 
  currentPlan, 
  userId, 
  onUpgradeComplete 
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) return;
    
    setIsUpgrading(true);
    setSelectedPlan(planId);

    try {
      // Create checkout session for Stripe
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: getPriceId(planId),
          userId: userId,
          planType: planId,
          mode: currentPlan === 'basic' ? 'subscription' : 'subscription_update'
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la actualización. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const handleDowngrade = async (planId: string) => {
    setIsUpgrading(true);
    setSelectedPlan(planId);

    try {
      // For downgrades, we update immediately and the change takes effect at the end of the billing period
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_type: planId,
          status: 'active',
          // Mark for end-of-period change
          cancel_at_period_end: true
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Plan actualizado",
        description: `Tu plan se cambiará a ${plans.find(p => p.id === planId)?.name} al final del período actual.`,
      });

      onUpgradeComplete?.();
    } catch (error) {
      console.error('Error downgrading plan:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el cambio de plan. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const getPriceId = (planId: string) => {
    // These should match your Stripe price IDs
    const priceIds = {
      basic: '', // Free plan has no price ID
      premium: 'price_premium_monthly', // Replace with actual Stripe price ID
      professional: 'price_professional_monthly' // Replace with actual Stripe price ID
    };
    return priceIds[planId as keyof typeof priceIds];
  };

  const isCurrentPlan = (planId: string) => planId === currentPlan;
  const isUpgrade = (planId: string) => {
    const planOrder = { basic: 0, premium: 1, professional: 2 };
    return planOrder[planId as keyof typeof planOrder] > planOrder[currentPlan as keyof typeof planOrder];
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card key={plan.id} className={`relative ${isCurrentPlan(plan.id) ? 'ring-2 ring-primary' : ''}`}>
          {plan.popular && (
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
              Más Popular
            </Badge>
          )}
          {isCurrentPlan(plan.id) && (
            <Badge className="absolute -top-2 right-4 bg-green-500">
              Plan Actual
            </Badge>
          )}
          
          <CardHeader className="text-center">
            <div className={`mx-auto w-12 h-12 rounded-full ${plan.color} flex items-center justify-center mb-4`}>
              {plan.icon}
            </div>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription className="text-2xl font-bold">{plan.price}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            
            {!isCurrentPlan(plan.id) && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className={`w-full ${plan.buttonColor} hover:opacity-90`}
                    disabled={isUpgrading}
                  >
                    {isUpgrade(plan.id) ? (
                      <>
                        Actualizar <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      'Cambiar Plan'
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isUpgrade(plan.id) ? 'Actualizar Plan' : 'Cambiar Plan'}
                    </DialogTitle>
                    <DialogDescription>
                      {isUpgrade(plan.id) 
                        ? `¿Estás seguro de que quieres actualizar a ${plan.name}? El cambio se aplicará inmediatamente.`
                        : `¿Estás seguro de que quieres cambiar a ${plan.name}? El cambio se aplicará al final de tu período de facturación actual.`
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex space-x-4 pt-4">
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Cancelar
                      </Button>
                    </DialogTrigger>
                    <Button
                      className={`flex-1 ${plan.buttonColor}`}
                      onClick={() => isUpgrade(plan.id) ? handleUpgrade(plan.id) : handleDowngrade(plan.id)}
                      disabled={isUpgrading && selectedPlan === plan.id}
                    >
                      {isUpgrading && selectedPlan === plan.id ? 'Procesando...' : 'Confirmar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            {isCurrentPlan(plan.id) && (
              <Button disabled className="w-full">
                Plan Actual
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SubscriptionUpgrade;