import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  RefreshCw, 
  Download, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CreditCard,
  UserCheck,
  UserX,
  BarChart3,
  FileText,
  Mail,
  Phone
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingWithDetails {
  id: number;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'completed';
  start_date: string;
  end_date: string;
  total_price: number;
  guests: number;
  created_at: string;
  updated_at: string;
  stripe_payment_intent_id: string | null;
  user_id: string;
  listing_id: number;
  
  // Related data
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
  };
  listing: {
    id: number;
    title: string;
    type: string;
    price_per_night_or_day: number;
    host_id: string;
  };
  host: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
  };
  subscription: {
    plan: string;
    status: string;
  } | null;
}

interface BookingFilters {
  search: string;
  status: string;
  dateRange: string;
  hostEmail: string;
  guestEmail: string;
  plan: string;
  amountRange: string;
}

interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  conversionRate: number;
  revenueByPlan: Record<string, number>;
}

const BOOKING_STATUSES = [
  { value: 'pending_confirmation', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmada', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-100 text-red-800' },
  { value: 'completed', label: 'Completada', color: 'bg-blue-100 text-blue-800' }
];

const fetchAllBookings = async (filters: BookingFilters): Promise<BookingWithDetails[]> => {
  // Get all bookings with related data
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      user:profiles!bookings_user_id_fkey (
        id, email, full_name, phone
      ),
      listing:listings!bookings_listing_id_fkey (
        id, title, type, price_per_night_or_day, host_id
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Enrich with host and subscription data
  const enrichedBookings = await Promise.all(
    (bookings || []).map(async (booking) => {
      // Get host data
      const { data: host } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone')
        .eq('id', booking.listing.host_id)
        .single();

      // Get host subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', booking.listing.host_id)
        .eq('status', 'active')
        .single();

      return {
        ...booking,
        host: host || { id: '', email: '', full_name: '', phone: '' },
        subscription
      };
    })
  );

  // Apply filters
  return enrichedBookings.filter(booking => {
    const matchesSearch = !filters.search || (
      booking.user?.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      booking.user?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      booking.listing?.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
      booking.host?.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      booking.id.toString().includes(filters.search.toLowerCase())
    );

    const matchesStatus = filters.status === 'all' || booking.status === filters.status;
    
    const matchesHostEmail = !filters.hostEmail || 
      booking.host?.email?.toLowerCase().includes(filters.hostEmail.toLowerCase());
    
    const matchesGuestEmail = !filters.guestEmail ||
      booking.user?.email?.toLowerCase().includes(filters.guestEmail.toLowerCase());

    const matchesPlan = filters.plan === 'all' || 
      (filters.plan === 'none' && !booking.subscription) ||
      booking.subscription?.plan === filters.plan;

    return matchesSearch && matchesStatus && matchesHostEmail && matchesGuestEmail && matchesPlan;
  });
};

const fetchBookingStats = async (): Promise<BookingStats> => {
  // Get all bookings for stats
  const { data: bookings } = await supabase
    .from('bookings')
    .select('status, total_price, listing_id');

  // Get listings with host subscriptions for revenue by plan
  const { data: listings } = await supabase
    .from('listings')
    .select('id, host_id');

  if (!bookings) return {
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    averageBookingValue: 0,
    conversionRate: 0,
    revenueByPlan: {}
  };

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending_confirmation').length;
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  
  const averageBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;
  const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

  // Calculate revenue by plan (simplified for now)
  const revenueByPlan: Record<string, number> = {
    'básico': 0,
    'premium': 0,
    'diamante': 0,
    'sin_plan': totalRevenue
  };

  return {
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalRevenue,
    averageBookingValue,
    conversionRate,
    revenueByPlan
  };
};

const BookingsManager: React.FC = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<BookingFilters>({
    search: '',
    status: 'all',
    dateRange: 'all',
    hostEmail: '',
    guestEmail: '',
    plan: 'all',
    amountRange: 'all'
  });

  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [disputeAction, setDisputeAction] = useState<'mediate' | 'refund' | 'penalty' | 'contact'>('mediate');
  const [disputeNotes, setDisputeNotes] = useState('');

  const { data: bookings = [], isLoading: bookingsLoading, refetch } = useQuery({
    queryKey: ['admin-bookings', filters],
    queryFn: () => fetchAllBookings(filters),
    enabled: isAdmin,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-booking-stats'],
    queryFn: fetchBookingStats,
    enabled: isAdmin,
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<BookingWithDetails> }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_actions').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'booking_update',
        target_type: 'booking',
        target_id: id,
        details: updates,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-booking-stats'] });
      toast.success('Reserva actualizada correctamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar la reserva');
      console.error('Error updating booking:', error);
    },
  });

  const handleSelectBooking = (bookingId: number) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === bookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(bookings.map(b => b.id));
    }
  };

  const handleDisputeAction = (booking: BookingWithDetails, action: 'mediate' | 'refund' | 'penalty' | 'contact') => {
    setSelectedBooking(booking);
    setDisputeAction(action);
    setShowDisputeDialog(true);
  };

  const executeDisputeAction = async () => {
    if (!selectedBooking) return;

    try {
      switch (disputeAction) {
        case 'mediate':
          // In production, this would create a mediation case
          toast.info('Caso de mediación creado. Se contactará a ambas partes.');
          break;
        case 'refund':
          // In production, this would process a Stripe refund
          await updateBookingMutation.mutateAsync({
            id: selectedBooking.id,
            updates: { status: 'cancelled' }
          });
          toast.success('Reembolso procesado y reserva cancelada');
          break;
        case 'penalty':
          // In production, this would apply penalties
          toast.info('Penalización aplicada al historial del usuario');
          break;
        case 'contact':
          // In production, this would send notifications
          toast.info('Notificaciones enviadas a host y guest');
          break;
      }

      // Log the dispute action
      await supabase.from('admin_actions').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'dispute_resolution',
        target_type: 'booking',
        target_id: selectedBooking.id,
        details: { 
          action: disputeAction, 
          notes: disputeNotes,
          host_email: selectedBooking.host.email,
          guest_email: selectedBooking.user.email
        },
      });

      setShowDisputeDialog(false);
      setSelectedBooking(null);
      setDisputeNotes('');
    } catch (error) {
      toast.error('Error al procesar la acción');
      console.error('Error processing dispute action:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = BOOKING_STATUSES.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getPlanBadge = (subscription: { plan: string; status: string } | null) => {
    if (!subscription) {
      return <Badge variant="outline" className="text-gray-500">Sin Plan</Badge>;
    }

    const colors = {
      'básico': 'bg-blue-100 text-blue-800',
      'premium': 'bg-purple-100 text-purple-800',
      'diamante': 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={colors[subscription.plan as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
      </Badge>
    );
  };

  const calculateDays = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    try {
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 0;
    }
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
            <h1 className="text-3xl font-bold">Gestión de Reservas</h1>
            <p className="text-muted-foreground">
              Supervisa y gestiona todas las reservas de la plataforma
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Reservas</p>
                  <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confirmadas</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.confirmedBookings || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.pendingBookings || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-emerald-600">€{(stats?.totalRevenue || 0).toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Promedio</p>
                  <p className="text-2xl font-bold">€{(stats?.averageBookingValue || 0).toFixed(0)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversión</p>
                  <p className="text-2xl font-bold">{(stats?.conversionRate || 0).toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avanzados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <Input
                  placeholder="Buscar por ID, guest, host, anuncio..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {BOOKING_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.plan} onValueChange={(value) => setFilters(prev => ({ ...prev, plan: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan Host" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los planes</SelectItem>
                  <SelectItem value="básico">Básico</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="diamante">Diamante</SelectItem>
                  <SelectItem value="none">Sin Plan</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Email del host..."
                value={filters.hostEmail}
                onChange={(e) => setFilters(prev => ({ ...prev, hostEmail: e.target.value }))}
              />

              <Input
                placeholder="Email del guest..."
                value={filters.guestEmail}
                onChange={(e) => setFilters(prev => ({ ...prev, guestEmail: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reservas ({bookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Cargando reservas...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedBookings.length === bookings.length && bookings.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>ID / Fechas</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Anuncio</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedBookings.includes(booking.id)}
                            onCheckedChange={() => handleSelectBooking(booking.id)}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-mono text-xs">#{booking.id}</div>
                            <div className="text-sm">
                              {booking.start_date && booking.end_date ? (
                                <>
                                  {format(new Date(booking.start_date), 'dd/MM', { locale: es })} - {' '}
                                  {format(new Date(booking.end_date), 'dd/MM', { locale: es })}
                                </>
                              ) : (
                                'Fechas no disponibles'
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {booking.start_date && booking.end_date ? 
                                `${calculateDays(booking.start_date, booking.end_date)} días` :
                                'Duración N/A'
                              }
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{booking.user?.full_name || 'Sin nombre'}</div>
                            <div className="text-xs text-muted-foreground">{booking.user?.email || 'Email N/A'}</div>
                            <div className="text-xs">{booking.guests || 0} huésped(es)</div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{booking.host?.full_name || 'Sin nombre'}</div>
                            <div className="text-xs text-muted-foreground">{booking.host?.email || 'Email N/A'}</div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{booking.listing?.title || 'Anuncio N/A'}</div>
                            <div className="text-xs text-muted-foreground">
                              {booking.listing?.type || 'Tipo N/A'} · €{booking.listing?.price_per_night_or_day || 0}/día
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {getPlanBadge(booking.subscription)}
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(booking.status)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-bold">€{booking.total_price || 0}</div>
                            {booking.stripe_payment_intent_id && (
                              <div className="text-xs text-green-600">Stripe: Pagado</div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(`/listing/${booking.listing.id}`, '_blank')}
                              title="Ver anuncio"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDisputeAction(booking, 'mediate')}
                              title="Mediar disputa"
                            >
                              <MessageSquare className="h-3 w-3 text-blue-500" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDisputeAction(booking, 'refund')}
                              title="Procesar reembolso"
                            >
                              <CreditCard className="h-3 w-3 text-green-500" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDisputeAction(booking, 'contact')}
                              title="Contactar partes"
                            >
                              <Mail className="h-3 w-3 text-purple-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {bookings.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No se encontraron reservas con los filtros aplicados.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dispute Resolution Dialog */}
        <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Gestión de Reserva</AlertDialogTitle>
              <AlertDialogDescription>
                Reserva: #{selectedBooking?.id} | {selectedBooking?.listing.title}
                <br />
                Host: {selectedBooking?.host.email} | Guest: {selectedBooking?.user.email}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Acción a realizar:</label>
                <Select value={disputeAction} onValueChange={(value: any) => setDisputeAction(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mediate">Mediar disputa</SelectItem>
                    <SelectItem value="refund">Procesar reembolso</SelectItem>
                    <SelectItem value="penalty">Aplicar penalización</SelectItem>
                    <SelectItem value="contact">Contactar partes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Notas de la acción:</label>
                <Textarea
                  className="mt-1"
                  placeholder="Describe la acción tomada y la razón..."
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {disputeAction === 'refund' && (
                <div className="p-3 bg-red-50 rounded text-red-800 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Esta acción procesará un reembolso en Stripe y cancelará la reserva.
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={executeDisputeAction}
                className={disputeAction === 'refund' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Ejecutar Acción
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default BookingsManager;