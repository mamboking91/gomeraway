import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Crown, 
  Star, 
  Circle, 
  CheckCircle, 
  Home,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Settings,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionUpgrade from '@/components/SubscriptionUpgrade';

interface UserSubscription {
  id: string;
  plan: string;
  status: string;
  created_at: string;
  stripe_subscription_id: string | null;
}

interface SubscriptionStats {
  listingsCount: number;
  listingsLimit: number;
  bookingsCount: number;
  revenue: number;
  canCreateMore: boolean;
}

const PLAN_LIMITS = {
  'básico': 1,
  'basico': 1,
  'premium': 5,
  'diamante': -1, // unlimited
} as const;

const PLAN_FEATURES = {
  basico: {
    name: 'Básico',
    price: '€9.99',
    period: '/mes',
    color: 'blue',
    icon: Circle,
    features: [
      '1 anuncio activo',
      'Soporte por email',
      'Panel básico de gestión',
      'Estadísticas básicas'
    ]
  },
  premium: {
    name: 'Premium',
    price: '€19.99',
    period: '/mes',
    color: 'purple',
    icon: Star,
    features: [
      '5 anuncios activos',
      'Soporte prioritario',
      'Panel avanzado',
      'Estadísticas detalladas',
      'Promoción destacada'
    ]
  },
  diamante: {
    name: 'Diamante',
    price: '€39.99',
    period: '/mes',
    color: 'yellow',
    icon: Crown,
    features: [
      'Anuncios ilimitados',
      'Soporte VIP 24/7',
      'Panel premium',
      'Analytics avanzados',
      'Promoción premium',
      'Acceso beta features'
    ]
  }
};

const fetchUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const fetchSubscriptionStats = async (userId: string): Promise<SubscriptionStats> => {
  // Obtener anuncios activos
  const { data: listings } = await supabase
    .from('listings')
    .select('id')
    .eq('host_id', userId)
    .eq('is_active', true);

  // Obtener reservas
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, total_price')
    .eq('user_id', userId)
    .eq('status', 'confirmed');

  // Obtener suscripción para límites
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  const listingsCount = listings?.length || 0;
  const bookingsCount = bookings?.length || 0;
  const revenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
  
  const planKey = subscription?.plan?.toLowerCase() || 'basico';
  const listingsLimit = PLAN_LIMITS[planKey as keyof typeof PLAN_LIMITS] || 1;
  const canCreateMore = listingsLimit === -1 || listingsCount < listingsLimit;

  return {
    listingsCount,
    listingsLimit,
    bookingsCount,
    revenue,
    canCreateMore
  };
};

const SubscriptionManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: () => fetchUserSubscription(user!.id),
    enabled: !!user?.id,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['subscription-stats', user?.id],
    queryFn: () => fetchSubscriptionStats(user!.id),
    enabled: !!user?.id,
  });

  const currentPlan = subscription?.plan?.toLowerCase() || 'basico';
  const currentPlanInfo = PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.basico;
  const CurrentIcon = currentPlanInfo.icon;

  const getUsagePercentage = () => {
    if (!stats) return 0;
    if (stats.listingsLimit === -1) return 0; // Unlimited
    return (stats.listingsCount / stats.listingsLimit) * 100;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
      case 'paused':
        return <Badge variant="secondary">Pausada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto py-12 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Acceso Requerido</h1>
            <p className="text-muted-foreground">
              Inicia sesión para gestionar tu suscripción.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (subLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando información de suscripción...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-12 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mi Suscripción</h1>
          <p className="text-muted-foreground">
            Gestiona tu plan y revisa el uso de tu cuenta de host
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${currentPlanInfo.color}-100`}>
                      <CurrentIcon className={`h-6 w-6 text-${currentPlanInfo.color}-500`} />
                    </div>
                    <div>
                      <CardTitle>Plan {currentPlanInfo.name}</CardTitle>
                      <CardDescription>
                        {subscription ? getStatusBadge(subscription.status) : 'Sin suscripción activa'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{currentPlanInfo.price}</div>
                    <div className="text-sm text-muted-foreground">{currentPlanInfo.period}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription && (
                  <div className="text-sm text-muted-foreground">
                    Suscripción activa desde: {' '}
                    {new Date(subscription.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Características incluidas:</h4>
                  <ul className="space-y-1">
                    {currentPlanInfo.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estadísticas de Uso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Listings Usage */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Anuncios Publicados</span>
                    <span className="text-sm text-muted-foreground">
                      {stats?.listingsCount || 0} / {stats?.listingsLimit === -1 ? '∞' : stats?.listingsLimit || 1}
                    </span>
                  </div>
                  {stats?.listingsLimit !== -1 && (
                    <Progress value={getUsagePercentage()} className="h-2" />
                  )}
                  {!stats?.canCreateMore && stats?.listingsLimit !== -1 && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Has alcanzado el límite de anuncios para tu plan
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Home className="h-8 w-8 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{stats?.listingsCount || 0}</div>
                      <div className="text-sm text-blue-700">Anuncios Activos</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Calendar className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold text-green-600">{stats?.bookingsCount || 0}</div>
                      <div className="text-sm text-green-700">Reservas Confirmadas</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <DollarSign className="h-8 w-8 text-emerald-500" />
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">
                        €{(stats?.revenue || 0).toFixed(0)}
                      </div>
                      <div className="text-sm text-emerald-700">Ingresos Totales</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <CreditCard className="h-8 w-8 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        €{stats?.bookingsCount ? ((stats.revenue || 0) / stats.bookingsCount).toFixed(0) : '0'}
                      </div>
                      <div className="text-sm text-purple-700">Promedio/Reserva</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upgrade Card */}
            {currentPlan !== 'diamante' && (
              <Card className="border-gradient-to-r from-purple-200 to-yellow-200">
                <CardHeader>
                  <CardTitle className="text-center">¿Necesitas más?</CardTitle>
                  <CardDescription className="text-center">
                    Actualiza tu plan para desbloquear más funcionalidades
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowUpgradeDialog(true)}
                  >
                    Ver Planes Disponibles
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/listings/create">
                    <Home className="h-4 w-4 mr-2" />
                    Crear Nuevo Anuncio
                  </a>
                </Button>
                
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/dashboard/host">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Ver Dashboard Host
                  </a>
                </Button>

                {subscription?.stripe_subscription_id && (
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Gestionar Facturación
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Plan Features */}
            <Card>
              <CardHeader>
                <CardTitle>Tu Plan Incluye</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentPlanInfo.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upgrade Dialog */}
        <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <AlertDialogContent className="max-w-4xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Planes Disponibles</AlertDialogTitle>
              <AlertDialogDescription>
                Elige el plan que mejor se adapte a tus necesidades
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <SubscriptionUpgrade 
              currentPlan={currentPlan}
              userId={user?.id || ''}
              onUpgradeComplete={() => {
                queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
                queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
                setShowUpgradeDialog(false);
              }}
            />

            <AlertDialogFooter>
              <AlertDialogCancel>Cerrar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      <Footer />
    </div>
  );
};

export default SubscriptionManagement;