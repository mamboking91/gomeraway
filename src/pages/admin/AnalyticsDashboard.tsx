import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  DollarSign, 
  Calendar,
  Home,
  CreditCard,
  Eye,
  RefreshCw,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  Target,
  Zap,
  Award,
  Globe
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnalyticsData {
  // KPIs principales
  totalUsers: number;
  totalHosts: number;
  activeListings: number;
  totalBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  conversionRate: number;
  averageBookingValue: number;

  // Growth data
  userGrowth: Array<{ date: string; users: number; hosts: number }>;
  revenueGrowth: Array<{ date: string; revenue: number; bookings: number }>;
  
  // Plan distribution
  planDistribution: Array<{ plan: string; users: number; revenue: number; percentage: number }>;
  
  // Funnel analysis
  funnelData: {
    visitors: number;
    signups: number;
    hosts: number;
    activeHosts: number;
    bookings: number;
  };

  // Performance metrics
  topPerformingHosts: Array<{
    id: string;
    name: string;
    email: string;
    listingsCount: number;
    bookingsCount: number;
    revenue: number;
  }>;

  // Recent activity
  recentActivity: Array<{
    type: 'user_signup' | 'host_signup' | 'listing_created' | 'booking_confirmed';
    description: string;
    timestamp: string;
    value?: number;
  }>;
}

const fetchAnalyticsData = async (timeRange: string): Promise<AnalyticsData> => {
  const endDate = new Date();
  let startDate: Date;
  
  switch (timeRange) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case '3m':
      startDate = subMonths(endDate, 3);
      break;
    case '1y':
      startDate = subMonths(endDate, 12);
      break;
    default:
      startDate = subDays(endDate, 30);
  }

  // Fetch all data in parallel with proper error handling
  const [
    subscriptionsResult,
    listingsResult,
    bookingsResult,
  ] = await Promise.all([
    supabase.from('subscriptions').select('*'),
    supabase.from('listings').select('*'),
    supabase.from('bookings').select('*'),
  ]);

  // Handle potential errors and extract data
  const subscriptions = subscriptionsResult.data;
  const listings = listingsResult.data;
  const bookings = bookingsResult.data;

  // Log any errors for debugging
  if (subscriptionsResult.error) {
    console.error('Error fetching subscriptions:', subscriptionsResult.error);
  }
  if (listingsResult.error) {
    console.error('Error fetching listings:', listingsResult.error);
  }
  if (bookingsResult.error) {
    console.error('Error fetching bookings:', bookingsResult.error);
  }

  // Count total users from subscriptions and other sources
  const allUserIds = new Set();
  subscriptions?.forEach(s => allUserIds.add(s.user_id));
  listings?.forEach(l => allUserIds.add(l.host_id));
  bookings?.forEach(b => allUserIds.add(b.user_id));

  // Calculate KPIs
  const totalUsers = allUserIds.size;
  const hostsWithSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
  const totalHosts = hostsWithSubscriptions.length;
  const activeListings = listings?.filter(l => l.is_active).length || 0;
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
  const totalBookings = confirmedBookings.length;
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  
  // Calculate monthly revenue (current month)
  const currentMonthStart = startOfMonth(endDate);
  const currentMonthBookings = confirmedBookings.filter(b => 
    new Date(b.created_at) >= currentMonthStart
  );
  const monthlyRevenue = currentMonthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  
  const conversionRate = totalUsers > 0 ? (totalHosts / totalUsers) * 100 : 0;
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Generate growth data
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const userGrowth = days.map(day => {
    // Count unique users up to this day from all sources
    const dayUserIds = new Set();
    subscriptions?.filter(s => new Date(s.created_at) <= day).forEach(s => dayUserIds.add(s.user_id));
    listings?.filter(l => new Date(l.created_at) <= day).forEach(l => dayUserIds.add(l.host_id));
    bookings?.filter(b => new Date(b.created_at) <= day).forEach(b => dayUserIds.add(b.user_id));
    
    const dayUsers = dayUserIds.size;
    const dayHosts = hostsWithSubscriptions.filter(s => new Date(s.created_at) <= day).length || 0;
    return {
      date: format(day, 'dd/MM'),
      users: dayUsers,
      hosts: dayHosts
    };
  });

  const revenueGrowth = days.map(day => {
    const dayBookings = confirmedBookings.filter(b => 
      new Date(b.created_at) <= day
    );
    const dayRevenue = dayBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    return {
      date: format(day, 'dd/MM'),
      revenue: dayRevenue,
      bookings: dayBookings.length
    };
  });

  // Plan distribution
  const planCounts = {
    'básico': hostsWithSubscriptions.filter(s => s.plan === 'básico').length,
    'premium': hostsWithSubscriptions.filter(s => s.plan === 'premium').length,
    'diamante': hostsWithSubscriptions.filter(s => s.plan === 'diamante').length,
  };

  const planRevenue = {
    'básico': planCounts['básico'] * 9.99,
    'premium': planCounts['premium'] * 19.99,
    'diamante': planCounts['diamante'] * 39.99,
  };

  const totalPlanRevenue = Object.values(planRevenue).reduce((sum, rev) => sum + rev, 0);

  const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
    plan: plan.charAt(0).toUpperCase() + plan.slice(1),
    users: count,
    revenue: planRevenue[plan as keyof typeof planRevenue],
    percentage: totalHosts > 0 ? (count / totalHosts) * 100 : 0
  }));

  // Funnel analysis
  const funnelData = {
    visitors: totalUsers * 3, // Estimate: 3 visitors per signup
    signups: totalUsers,
    hosts: totalHosts,
    activeHosts: hostsWithSubscriptions.filter(s => {
      // Active hosts are those with listings
      return listings?.some(l => l.host_id === s.user_id && l.is_active);
    }).length,
    bookings: totalBookings,
  };

  // Top performing hosts - Fetch host data individually to avoid RLS issues
  const hostsWithStats = await Promise.all(
    hostsWithSubscriptions.map(async (sub) => {
      const hostListings = listings?.filter(l => l.host_id === sub.user_id) || [];
      const hostBookings = confirmedBookings.filter(b => 
        hostListings.some(l => l.id === b.listing_id)
      );
      
      // Try to fetch the specific host profile with better error handling
      let hostProfile = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', sub.user_id)
          .single();
          
        if (error) {
          console.warn(`Could not fetch profile for host ${sub.user_id}:`, error.message);
        } else {
          hostProfile = data;
        }
      } catch (err) {
        console.warn(`Error fetching profile for host ${sub.user_id}:`, err);
      }
      
      const hostStats = {
        id: sub.user_id,
        name: hostProfile?.full_name || `Host ${sub.user_id.slice(0, 8)}`,
        email: hostProfile?.email || `host-${sub.user_id.slice(0, 8)}@example.com`,
        listingsCount: hostListings.length,
        bookingsCount: hostBookings.length,
        revenue: hostBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)
      };
      
      console.log(`Host ${sub.user_id} stats:`, hostStats);
      return hostStats;
    })
  );

  const topPerformingHosts = hostsWithStats
    .filter(host => host.revenue > 0 || host.bookingsCount > 0) // Only hosts with activity
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Recent activity (last 10 items)
  const recentActivity: AnalyticsData['recentActivity'] = [];
  
  // Recent bookings
  confirmedBookings.slice(-3).forEach(booking => {
    recentActivity.push({
      type: 'booking_confirmed',
      description: `Nueva reserva confirmada por €${booking.total_price}`,
      timestamp: booking.created_at,
      value: booking.total_price
    });
  });

  // Recent hosts
  hostsWithSubscriptions.slice(-3).forEach(sub => {
    recentActivity.push({
      type: 'host_signup',
      description: `Nuevo host registrado (Plan ${sub.plan})`,
      timestamp: sub.created_at
    });
  });

  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    totalUsers,
    totalHosts,
    activeListings,
    totalBookings,
    totalRevenue,
    monthlyRevenue,
    conversionRate,
    averageBookingValue,
    userGrowth,
    revenueGrowth,
    planDistribution,
    funnelData,
    topPerformingHosts,
    recentActivity: recentActivity.slice(0, 10)
  };
};

const AnalyticsDashboard: React.FC = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [timeRange, setTimeRange] = useState('30d');

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['admin-analytics', timeRange],
    queryFn: () => fetchAnalyticsData(timeRange),
    enabled: isAdmin,
  });

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return { direction: 'up', percentage: 0, color: 'text-gray-500' };
    
    const change = ((current - previous) / previous) * 100;
    if (change > 0) {
      return { direction: 'up', percentage: change, color: 'text-green-600' };
    } else if (change < 0) {
      return { direction: 'down', percentage: Math.abs(change), color: 'text-red-600' };
    } else {
      return { direction: 'neutral', percentage: 0, color: 'text-gray-500' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
            <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
          </div>
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
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Insights y métricas de negocio de la plataforma
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 días</SelectItem>
                <SelectItem value="30d">30 días</SelectItem>
                <SelectItem value="3m">3 meses</SelectItem>
                <SelectItem value="1y">1 año</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando analytics...</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="growth">Crecimiento</TabsTrigger>
              <TabsTrigger value="revenue">Ingresos</TabsTrigger>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Main KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
                        <p className="text-2xl font-bold">{analytics?.totalUsers || 0}</p>
                        <div className="flex items-center mt-1">
                          <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">+12% vs mes anterior</span>
                        </div>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Hosts Activos</p>
                        <p className="text-2xl font-bold">{analytics?.totalHosts || 0}</p>
                        <div className="flex items-center mt-1">
                          <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">+8% vs mes anterior</span>
                        </div>
                      </div>
                      <Home className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                        <p className="text-2xl font-bold">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                        <div className="flex items-center mt-1">
                          <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">+23% vs mes anterior</span>
                        </div>
                      </div>
                      <DollarSign className="h-8 w-8 text-emerald-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tasa Conversión</p>
                        <p className="text-2xl font-bold">{(analytics?.conversionRate || 0).toFixed(1)}%</p>
                        <div className="flex items-center mt-1">
                          <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                          <span className="text-xs text-green-600">+5% vs mes anterior</span>
                        </div>
                      </div>
                      <Target className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Reservas Este Mes</p>
                        <p className="text-xl font-bold">{analytics?.totalBookings || 0}</p>
                      </div>
                      <Calendar className="h-6 w-6 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valor Promedio Reserva</p>
                        <p className="text-xl font-bold">{formatCurrency(analytics?.averageBookingValue || 0)}</p>
                      </div>
                      <BarChart3 className="h-6 w-6 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Anuncios Activos</p>
                        <p className="text-xl font-bold">{analytics?.activeListings || 0}</p>
                      </div>
                      <Eye className="h-6 w-6 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Conversion Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Funnel de Conversión
                  </CardTitle>
                  <CardDescription>
                    Análisis del flujo de usuarios desde visitantes hasta reservas
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="space-y-4">
                    {[
                      { label: 'Visitantes', value: analytics?.funnelData.visitors || 0, color: 'bg-blue-500' },
                      { label: 'Registros', value: analytics?.funnelData.signups || 0, color: 'bg-purple-500' },
                      { label: 'Hosts', value: analytics?.funnelData.hosts || 0, color: 'bg-emerald-500' },
                      { label: 'Hosts Activos', value: analytics?.funnelData.activeHosts || 0, color: 'bg-orange-500' },
                      { label: 'Reservas', value: analytics?.funnelData.bookings || 0, color: 'bg-red-500' },
                    ].map((item, index) => {
                      const total = analytics?.funnelData.visitors || 1;
                      const percentage = (item.value / total) * 100;
                      
                      return (
                        <div key={item.label} className="flex items-center gap-4">
                          <div className="w-20 text-sm font-medium flex-shrink-0">{item.label}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-4 relative min-w-0">
                            <div 
                              className={`${item.color} h-4 rounded-full transition-all duration-300`}
                              style={{ width: `${Math.min(Math.max(percentage, 2), 100)}%` }}
                            />
                          </div>
                          <div className="w-14 text-sm font-bold flex-shrink-0">{item.value.toLocaleString()}</div>
                          <div className="w-12 text-xs text-muted-foreground flex-shrink-0">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Hosts & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Top Hosts
                    </CardTitle>
                    <CardDescription>
                      Hosts con mejor rendimiento por ingresos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics?.topPerformingHosts && analytics.topPerformingHosts.length > 0 ? 
                        analytics.topPerformingHosts.map((host, index) => (
                          <div key={host.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{host.name}</div>
                                <div className="text-xs text-muted-foreground">{host.email}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">{formatCurrency(host.revenue)}</div>
                              <div className="text-xs text-muted-foreground">
                                {host.bookingsCount} reservas
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-6">
                            <p className="text-muted-foreground text-sm">
                              No hay hosts con actividad aún
                            </p>
                          </div>
                        )
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Actividad Reciente
                    </CardTitle>
                    <CardDescription>
                      Últimas acciones en la plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics?.recentActivity.slice(0, 8).map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'booking_confirmed' ? 'bg-green-500' :
                            activity.type === 'host_signup' ? 'bg-purple-500' :
                            activity.type === 'user_signup' ? 'bg-blue-500' :
                            'bg-gray-500'
                          }`} />
                          <div className="flex-1">
                            <div className="text-sm">{activity.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(activity.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </div>
                          </div>
                          {activity.value && (
                            <div className="text-sm font-medium text-green-600">
                              +{formatCurrency(activity.value)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Growth Tab */}
            <TabsContent value="growth" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Crecimiento de Usuarios</CardTitle>
                    <CardDescription>
                      Evolución de usuarios registrados y hosts en el tiempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded" />
                          <span className="text-sm">Usuarios</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded" />
                          <span className="text-sm">Hosts</span>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="h-64 flex items-end justify-between gap-2 px-2">
                          {analytics?.userGrowth.slice(-10).map((point, index) => {
                            const maxValue = Math.max(
                              ...analytics.userGrowth.map(p => Math.max(p.users, p.hosts)),
                              1
                            );
                            const maxHeight = 200; // Altura máxima para las barras
                            const userHeight = Math.max((point.users / maxValue) * maxHeight, 4);
                            const hostHeight = Math.max((point.hosts / maxValue) * maxHeight, 4);
                            
                            return (
                              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                                <div className="flex items-end gap-1 w-full justify-center">
                                  <div 
                                    className="bg-blue-500 rounded-t w-4 transition-all duration-300 hover:bg-blue-600"
                                    style={{ height: `${userHeight}px` }}
                                    title={`${point.users} usuarios`}
                                  />
                                  <div 
                                    className="bg-purple-500 rounded-t w-4 transition-all duration-300 hover:bg-purple-600"
                                    style={{ height: `${hostHeight}px` }}
                                    title={`${point.hosts} hosts`}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground text-center">
                                  {point.date}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribución de Planes</CardTitle>
                    <CardDescription>
                      Usuarios por plan de suscripción
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics?.planDistribution.map((plan) => (
                        <div key={plan.plan} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{plan.plan}</span>
                            <span className="text-sm text-muted-foreground">
                              {plan.users} usuarios ({plan.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                plan.plan === 'Básico' ? 'bg-emerald-500' :
                                plan.plan === 'Premium' ? 'bg-orange-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${plan.percentage}%` }}
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Ingresos: {formatCurrency(plan.revenue)} mensual
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Evolución de Ingresos</CardTitle>
                    <CardDescription>
                      Ingresos acumulados y número de reservas en el tiempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end justify-between gap-1">
                      {analytics?.revenueGrowth.slice(-14).map((point, index) => (
                        <div key={index} className="flex flex-col items-center gap-1 flex-1">
                          <div 
                            className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t"
                            style={{ 
                              height: `${Math.max((point.revenue / (analytics.totalRevenue || 1)) * 200, 2)}px` 
                            }}
                            title={`${formatCurrency(point.revenue)} - ${point.bookings} reservas`}
                          />
                          <span className="text-xs text-muted-foreground transform -rotate-45">
                            {point.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumen Financiero</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Ingresos Totales</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(analytics?.totalRevenue || 0)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Ingresos Este Mes</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(analytics?.monthlyRevenue || 0)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground">Ingresos por Suscripciones</div>
                      <div className="text-lg font-bold">
                        {formatCurrency(
                          (analytics?.planDistribution.reduce((sum, plan) => sum + plan.revenue, 0) || 0)
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">Mensual recurrente</div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground">Valor Promedio Reserva</div>
                      <div className="text-lg font-bold">
                        {formatCurrency(analytics?.averageBookingValue || 0)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Estadísticas de Usuarios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{analytics?.totalUsers || 0}</div>
                        <div className="text-sm text-blue-700">Total Usuarios</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{analytics?.totalHosts || 0}</div>
                        <div className="text-sm text-purple-700">Total Hosts</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Tasa de Conversión Usuario → Host</span>
                        <span className="text-sm font-bold">{(analytics?.conversionRate || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${analytics?.conversionRate || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Hosts con Anuncios Activos</span>
                        <span className="font-medium">{analytics?.funnelData.activeHosts || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Hosts sin Anuncios</span>
                        <span className="font-medium">
                          {(analytics?.totalHosts || 0) - (analytics?.funnelData.activeHosts || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Usuarios Regulares</span>
                        <span className="font-medium">
                          {(analytics?.totalUsers || 0) - (analytics?.totalHosts || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rendimiento por Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics?.planDistribution.map((plan) => (
                        <div key={plan.plan} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{plan.plan}</span>
                            <Badge variant={
                              plan.plan === 'Diamante' ? 'default' :
                              plan.plan === 'Premium' ? 'secondary' : 'outline'
                            }>
                              {plan.users} hosts
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Representa el {plan.percentage.toFixed(1)}% de hosts
                          </div>
                          <div className="text-lg font-bold">
                            {formatCurrency(plan.revenue)}/mes
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default AnalyticsDashboard;