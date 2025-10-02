import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Search, 
  Crown, 
  Star, 
  Circle,
  MoreHorizontal,
  Edit,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  DollarSign,
  Calendar,
  TrendingUp,
  Users,
  Filter,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at?: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  listingsCount?: number;
  bookingsCount?: number;
  revenue?: number;
}

const fetchSubscriptions = async (): Promise<Subscription[]> => {
  // Obtener suscripciones con información completa de usuarios
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Para cada suscripción, obtener métricas completas
  const subscriptionsWithMetrics = await Promise.all(
    (subscriptions || []).map(async (sub) => {
      // Contar anuncios activos
      const { data: listings } = await supabase
        .from('listings')
        .select('id')
        .eq('host_id', sub.user_id)
        .eq('is_active', true);

      // Contar reservas confirmadas
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_price')
        .eq('user_id', sub.user_id)
        .eq('status', 'confirmed');

      // Calcular ingresos totales
      const revenue = bookings?.reduce((total, booking) => 
        total + (booking.total_price || 0), 0
      ) || 0;

      return {
        ...sub,
        listingsCount: listings?.length || 0,
        bookingsCount: bookings?.length || 0,
        revenue,
      };
    })
  );

  return subscriptionsWithMetrics;
};

const SubscriptionsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('all');

  const { data: subscriptions, isLoading, error } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: fetchSubscriptions,
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Subscription> }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log de auditoría
      await supabase.from('admin_actions').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'subscription_update',
        target_type: 'subscription',
        target_id: id,
        details: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Suscripción actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating subscription:', error);
      toast.error('Error al actualizar la suscripción');
    },
  });

  // Filtrar suscripciones
  const filteredSubscriptions = subscriptions?.filter(sub => {
    const matchesSearch = 
      sub.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.plan.toLowerCase().includes(planFilter.toLowerCase());

    // Filtro por fecha
    const matchesDate = dateFilter === 'all' || (() => {
      const subDate = new Date(sub.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'week': return daysDiff <= 7;
        case 'month': return daysDiff <= 30;
        case 'quarter': return daysDiff <= 90;
        default: return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesPlan && matchesDate;
  }) || [];

  // Calcular métricas agregadas
  const metrics = {
    totalSubscriptions: subscriptions?.length || 0,
    activeSubscriptions: subscriptions?.filter(s => s.status === 'active').length || 0,
    totalRevenue: subscriptions?.reduce((sum, s) => sum + (s.revenue || 0), 0) || 0,
    avgRevenuePerUser: subscriptions?.length ? 
      (subscriptions.reduce((sum, s) => sum + (s.revenue || 0), 0) / subscriptions.length) : 0,
    planDistribution: {
      basico: subscriptions?.filter(s => s.plan.toLowerCase().includes('basico')).length || 0,
      premium: subscriptions?.filter(s => s.plan.toLowerCase().includes('premium')).length || 0,
      diamante: subscriptions?.filter(s => s.plan.toLowerCase().includes('diamante')).length || 0,
    }
  };

  const handleStatusChange = (subscriptionId: string, newStatus: string) => {
    updateSubscriptionMutation.mutate({
      id: subscriptionId,
      updates: { status: newStatus },
    });
  };

  const handlePlanChange = (subscriptionId: string, newPlan: string) => {
    updateSubscriptionMutation.mutate({
      id: subscriptionId,
      updates: { plan: newPlan },
    });
  };

  const getPlanIcon = (plan: string) => {
    const planLower = plan.toLowerCase();
    if (planLower.includes('diamante')) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (planLower.includes('premium')) return <Star className="h-4 w-4 text-purple-500" />;
    return <Circle className="h-4 w-4 text-blue-500" />;
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Gestión de Suscripciones</h1>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
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
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Error cargando suscripciones</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Suscripciones</h1>
            <p className="text-muted-foreground">
              Administra las suscripciones y planes de los hosts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Enhanced Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros Avanzados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nombre, email, plan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="diamante">Diamante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo el tiempo</SelectItem>
                      <SelectItem value="week">Última semana</SelectItem>
                      <SelectItem value="month">Último mes</SelectItem>
                      <SelectItem value="quarter">Último trimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div className="text-2xl font-bold">{metrics.totalSubscriptions}</div>
              </div>
              <div className="text-sm text-muted-foreground">Total Suscripciones</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div className="text-2xl font-bold text-green-600">{metrics.activeSubscriptions}</div>
              </div>
              <div className="text-sm text-muted-foreground">Activas</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <div className="text-2xl font-bold text-emerald-600">€{metrics.totalRevenue.toFixed(0)}</div>
              </div>
              <div className="text-sm text-muted-foreground">Ingresos Totales</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <div className="text-2xl font-bold text-purple-600">€{metrics.avgRevenuePerUser.toFixed(0)}</div>
              </div>
              <div className="text-sm text-muted-foreground">Promedio/Usuario</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div className="text-2xl font-bold text-orange-600">
                  {subscriptions?.filter(s => s.status === 'cancelled').length || 0}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Canceladas</div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Distribución por Planes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Básico</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{metrics.planDistribution.basico}</div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Premium</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{metrics.planDistribution.premium}</div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Diamante</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{metrics.planDistribution.diamante}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions List */}
        <div className="space-y-4">
          {filteredSubscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {getPlanIcon(subscription.plan)}
                      <div>
                        <h3 className="font-medium">
                          {subscription.profiles?.full_name || 'Usuario'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          ID: {subscription.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span>Plan:</span>
                        <Badge variant="outline">{subscription.plan}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Estado:</span>
                        {getStatusBadge(subscription.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Anuncios:</span>
                        <Badge variant="secondary">{subscription.listingsCount}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Reservas:</span>
                        <Badge variant="outline">{subscription.bookingsCount || 0}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Ingresos:</span>
                        <Badge variant="outline" className="text-green-600">
                          €{(subscription.revenue || 0).toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Creada: {new Date(subscription.created_at).toLocaleDateString('es-ES')}
                      {subscription.stripe_subscription_id && (
                        <span className="ml-4">
                          Stripe ID: {subscription.stripe_subscription_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Change Plan */}
                    <Select
                      value={subscription.plan}
                      onValueChange={(newPlan) => handlePlanChange(subscription.id, newPlan)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Básico">Básico</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                        <SelectItem value="Diamante">Diamante</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Status Actions */}
                    {subscription.status === 'active' ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Pause className="h-3 w-3 mr-1" />
                            Pausar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Pausar Suscripción</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que quieres pausar esta suscripción? 
                              El usuario no podrá crear nuevos anuncios.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStatusChange(subscription.id, 'paused')}
                            >
                              Pausar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(subscription.id, 'active')}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Activar
                      </Button>
                    )}

                    {/* View User */}
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/admin/users/${subscription.user_id}`}>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredSubscriptions.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  No se encontraron suscripciones con los filtros aplicados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubscriptionsManager;