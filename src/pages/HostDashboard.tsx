import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Header from '@/components/header';
import Footer from '@/components/footer';
import HostReservations from '@/components/HostReservations';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useListingLimits } from '@/hooks/useListingLimits';
import LimitIndicator from '@/components/LimitIndicator';
import { 
  Plus, 
  Home, 
  Calendar, 
  DollarSign, 
  Users, 
  Eye, 
  Edit, 
  ToggleLeft, 
  ToggleRight,
  CheckCircle,
  XCircle,
  Clock,
  Car,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Funciones para obtener datos
const fetchHostListings = async (hostId: string) => {
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Obtener detalles para cada listing
  const listingsWithDetails = await Promise.all(
    listings?.map(async (listing) => {
      if (listing.type === 'accommodation') {
        const { data: details } = await supabase
          .from('listing_details_accommodation')
          .select('*')
          .eq('listing_id', listing.id)
          .single();
        
        return { ...listing, details };
      } else if (listing.type === 'vehicle') {
        const { data: details } = await supabase
          .from('listing_details_vehicle')
          .select('*')
          .eq('listing_id', listing.id)
          .single();
        
        return { ...listing, details };
      }
      return listing;
    }) || []
  );

  return listingsWithDetails;
};

// Función para obtener estadísticas del host
const fetchHostStats = async (hostId: string) => {
  // Obtener IDs de los listings del host
  const { data: hostListings, error: listingsError } = await supabase
    .from('listings')
    .select('id')
    .eq('host_id', hostId);

  if (listingsError) throw listingsError;

  if (!hostListings || hostListings.length === 0) {
    return {
      pendingBookings: 0,
      totalBookings: 0,
      monthlyRevenue: 0,
      totalGuests: 0,
    };
  }

  const listingIds = hostListings.map(listing => listing.id);

  // Obtener todas las reservas para los listings del host
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .in('listing_id', listingIds);

  if (bookingsError) throw bookingsError;

  if (!bookings) {
    return {
      pendingBookings: 0,
      totalBookings: 0,
      monthlyRevenue: 0,
      totalGuests: 0,
    };
  }

  // Calcular estadísticas
  const pendingBookings = bookings.filter(b => b.status === 'pending_confirmation').length;
  const totalBookings = bookings.length;
  
  // Ingresos de este mes (solo reservas confirmadas)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = bookings
    .filter(b => {
      if (b.status !== 'confirmed') return false;
      const bookingDate = new Date(b.created_at);
      return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
    })
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  // Huéspedes únicos (solo reservas confirmadas)
  const uniqueGuests = new Set(
    bookings
      .filter(b => b.status === 'confirmed')
      .map(b => b.user_id)
  ).size;

  return {
    pendingBookings,
    totalBookings,
    monthlyRevenue,
    totalGuests: uniqueGuests,
  };
};

const HostDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Hook para límites de anuncios
  const limits = useListingLimits();

  useEffect(() => {
    // Verificar autenticación
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate('/'); // Redirigir si no está autenticado
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Obtener listings del host
  const { data: listings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ['host-listings', session?.user?.id],
    queryFn: () => fetchHostListings(session?.user?.id || ''),
    enabled: !!session?.user?.id,
  });

  // Obtener estadísticas del host
  const { data: stats } = useQuery({
    queryKey: ['host-stats', session?.user?.id],
    queryFn: () => fetchHostStats(session?.user?.id || ''),
    enabled: !!session?.user?.id,
  });

  // Mutación para activar/desactivar listing
  const toggleListingMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('listings')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-listings'] });
      toast.success('Anuncio actualizado correctamente');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al actualizar el anuncio: ' + errorMessage);
    },
  });

  // Mutación para eliminar listing
  const deleteListingMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primero eliminar los detalles específicos
      await supabase.from('listing_details_accommodation').delete().eq('listing_id', id);
      await supabase.from('listing_details_vehicle').delete().eq('listing_id', id);
      
      // Luego eliminar el listing principal
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-listings'] });
      toast.success('Anuncio eliminado correctamente');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al eliminar el anuncio: ' + errorMessage);
    },
  });

  const handleToggleListing = (id: string, currentStatus: boolean) => {
    toggleListingMutation.mutate({ id, is_active: !currentStatus });
  };

  const handleViewListing = (id: string) => {
    navigate(`/listing/${id}`);
  };

  const handleEditListing = (id: string) => {
    navigate(`/listings/edit/${id}`);
  };

  const handleDeleteListing = (id: string) => {
    deleteListingMutation.mutate(id);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>;
  }

  if (!session) {
    return null;
  }

  const activeListings = listings.filter(l => l.is_active).length;
  const totalListings = listings.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Panel de Anfitrión
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus anuncios y reservas en La Gomera
          </p>
        </div>

        {/* Límites de Anuncios */}
        <div className="mb-6">
          <LimitIndicator
            currentCount={limits.currentCount}
            maxAllowed={limits.maxAllowed}
            planName={limits.planName}
            isUnlimited={limits.isUnlimited}
            loading={limits.loading}
          />
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Anuncios Activos
              </CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeListings}</div>
              <p className="text-xs text-muted-foreground">
                de {totalListings} listings
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Reservas Pendientes
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingBookings || 0}</div>
              <p className="text-xs text-muted-foreground">
                esperando confirmación
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ingresos Este Mes
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats?.monthlyRevenue?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                ingresos este mes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Huéspedes Totales
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalGuests || 0}</div>
              <p className="text-xs text-muted-foreground">
                huéspedes únicos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="listings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="listings">Mis Anuncios</TabsTrigger>
            <TabsTrigger value="reservations">Mis Reservas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="listings" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Mis Anuncios</h2>
                <p className="text-muted-foreground">
                  Gestiona tus propiedades y vehículos en alquiler
                </p>
              </div>
              <Button onClick={() => navigate('/listings/create')}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Anuncio
              </Button>
            </div>
            
            {/* Listings Content */}
            {isLoadingListings ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <p>Cargando anuncios...</p>
                </CardContent>
              </Card>
            ) : totalListings === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Home className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes anuncios aún</h3>
                  <p className="text-muted-foreground text-center mb-4 max-w-sm">
                    Comienza creando tu primer anuncio para alojamiento o vehículo en La Gomera
                  </p>
                  <Button onClick={() => navigate('/listings/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear tu Primer Anuncio
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {listings.map((listing) => (
                  <Card key={listing.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex space-x-4">
                          <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                            {listing.type === 'accommodation' ? (
                              <Home className="h-8 w-8 text-muted-foreground" />
                            ) : (
                              <Car className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-lg">{listing.title}</h3>
                              <Badge variant={listing.is_active ? "default" : "secondary"}>
                                {listing.is_active ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                            
                            <p className="text-muted-foreground mb-2">{listing.location}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {listing.description}
                            </p>
                            
                            <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                              <span>€{listing.price_per_night_or_day}/{listing.type === 'accommodation' ? 'noche' : 'día'}</span>
                              {listing.type === 'accommodation' && listing.details ? (
                                <>
                                  {listing.details.max_guests && <span>• {listing.details.max_guests} huéspedes</span>}
                                  {listing.details.bedrooms && <span>• {listing.details.bedrooms} dorm.</span>}
                                </>
                              ) : listing.type === 'vehicle' && listing.details ? (
                                <>
                                  {listing.details.seats && <span>• {listing.details.seats} asientos</span>}
                                  {listing.details.vehicle_type && <span>• {listing.details.vehicle_type}</span>}
                                </>
                              ) : (
                                <span>• Tipo: {listing.type === 'accommodation' ? 'Alojamiento' : 'Vehículo'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={listing.is_active}
                              onCheckedChange={() => handleToggleListing(listing.id, listing.is_active)}
                              disabled={toggleListingMutation.isPending}
                            />
                            <span className="text-sm">
                              {listing.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewListing(listing.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditListing(listing.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Eliminar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar anuncio?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente 
                                    el anuncio "{listing.title}" y todos sus datos asociados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteListing(listing.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="reservations" className="space-y-4">
            <HostReservations />
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
};

export default HostDashboard;