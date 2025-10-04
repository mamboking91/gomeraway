import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  CreditCard, 
  Home as HomeIcon, 
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalHosts: number;
  activeSubscriptions: number;
  totalListings: number;
  activeListings: number;
  pendingBookings: number;
  monthlyRevenue: number;
  subscriptionsByPlan: {
    basico: number;
    premium: number;
    diamante: number;
  };
}

const fetchAdminStats = async (): Promise<DashboardStats> => {
  // 1. Contar usuarios totales y hosts
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('role');

  if (usersError) throw usersError;

  const totalUsers = users?.length || 0;
  const totalHosts = users?.filter(u => u.role === 'host' || u.role === 'admin').length || 0;

  // 2. Contar suscripciones activas (opcional - tabla puede no existir)
  let activeSubscriptions = 0;
  const subscriptionsByPlan = { basico: 0, premium: 0, diamante: 0 };
  
  try {
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('plan, status');

    if (!subsError && subscriptions) {
      activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
      
      // Contar por plan
      subscriptions.forEach(sub => {
        if (sub.status === 'active') {
          const planKey = sub.plan.toLowerCase().replace('á', 'a') as keyof typeof subscriptionsByPlan;
          if (subscriptionsByPlan[planKey] !== undefined) {
            subscriptionsByPlan[planKey]++;
          }
        }
      });
    }
  } catch (error) {
    console.warn('Subscriptions table not available:', error);
    // Continue without subscriptions data
  }

  // 3. Contar listings
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('is_active');

  if (listingsError) throw listingsError;

  const totalListings = listings?.length || 0;
  const activeListings = listings?.filter(l => l.is_active).length || 0;

  // 4. Contar bookings pendientes
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('status, total_price, created_at');

  if (bookingsError) throw bookingsError;

  const pendingBookings = bookings?.filter(b => b.status === 'pending_confirmation').length || 0;

  // 5. Calcular ingresos mensuales (aproximado, basado en suscripciones)
  const monthlyRevenue = 
    (subscriptionsByPlan.basico * 10) + 
    (subscriptionsByPlan.premium * 25) + 
    (subscriptionsByPlan.diamante * 50);

  return {
    totalUsers,
    totalHosts,
    activeSubscriptions,
    totalListings,
    activeListings,
    pendingBookings,
    monthlyRevenue,
    subscriptionsByPlan,
  };
};

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Dashboard Principal</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error cargando estadísticas</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statsCards = [
    {
      title: 'Usuarios Totales',
      value: stats?.totalUsers || 0,
      description: `${stats?.totalHosts || 0} hosts activos`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Suscripciones Activas',
      value: stats?.activeSubscriptions || 0,
      description: `€${stats?.monthlyRevenue || 0}/mes ingresos`,
      icon: CreditCard,
      color: 'text-green-600',
    },
    {
      title: 'Anuncios',
      value: stats?.activeListings || 0,
      description: `de ${stats?.totalListings || 0} totales`,
      icon: HomeIcon,
      color: 'text-purple-600',
    },
    {
      title: 'Reservas Pendientes',
      value: stats?.pendingBookings || 0,
      description: 'Requieren atención',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Principal</h1>
            <p className="text-muted-foreground">
              Resumen general de la plataforma GomeraWay
            </p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sistema Operativo
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suscripciones por Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Suscripciones por Plan</CardTitle>
              <CardDescription>
                Distribución de usuarios por tipo de plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Plan Básico</span>
                </div>
                <div className="font-medium">
                  {stats?.subscriptionsByPlan.basico || 0}
                  <span className="text-sm text-muted-foreground ml-1">
                    (€{(stats?.subscriptionsByPlan.basico || 0) * 10}/mes)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Plan Premium</span>
                </div>
                <div className="font-medium">
                  {stats?.subscriptionsByPlan.premium || 0}
                  <span className="text-sm text-muted-foreground ml-1">
                    (€{(stats?.subscriptionsByPlan.premium || 0) * 25}/mes)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Plan Diamante</span>
                </div>
                <div className="font-medium">
                  {stats?.subscriptionsByPlan.diamante || 0}
                  <span className="text-sm text-muted-foreground ml-1">
                    (€{(stats?.subscriptionsByPlan.diamante || 0) * 50}/mes)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>
                Enlaces rápidos a funciones administrativas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a 
                href="/admin/subscriptions" 
                className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Gestionar Suscripciones</div>
                    <div className="text-sm text-muted-foreground">
                      Ver y modificar planes de hosts
                    </div>
                  </div>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
              <a 
                href="/admin/listings" 
                className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Moderar Anuncios</div>
                    <div className="text-sm text-muted-foreground">
                      Revisar y gestionar listings
                    </div>
                  </div>
                  <HomeIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
              <a 
                href="/admin/users" 
                className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Gestionar Usuarios</div>
                    <div className="text-sm text-muted-foreground">
                      Administrar cuentas y roles
                    </div>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;