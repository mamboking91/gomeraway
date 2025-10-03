import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Search, 
  Home,
  Car,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Filter,
  Download,
  RefreshCw,
  Flag
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ListingWithDetails {
  id: number;
  title: string;
  description: string;
  type: 'accommodation' | 'vehicle';
  location: string;
  price_per_night_or_day: number;
  is_active: boolean;
  images_urls: string[];
  created_at: string;
  updated_at: string;
  host_id: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  subscription?: {
    plan: string;
    status: string;
  } | null;
  _count?: {
    bookings: number;
    views: number;
  };
  total_revenue?: number;
}

const fetchAllListings = async (): Promise<ListingWithDetails[]> => {
  // Obtener todos los anuncios con información del host y suscripción
  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      *,
      profiles:host_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Para cada anuncio, obtener datos de reservas, suscripción y analytics
  const listingsWithDetails = await Promise.all(
    (listings || []).map(async (listing) => {
      // Obtener reservas confirmadas
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_price, status')
        .eq('listing_id', listing.id)
        .eq('status', 'confirmed');

      // Obtener suscripción del host
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', listing.host_id)
        .eq('status', 'active')
        .single();

      // Calcular revenue total
      const totalRevenue = bookings?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;

      // Simular views (en producción esto vendría de una tabla de analytics)
      const viewCount = Math.floor(Math.random() * 100) + (bookings?.length || 0) * 5;

      return {
        ...listing,
        _count: {
          bookings: bookings?.length || 0,
          views: viewCount,
        },
        subscription: subscription || null,
        total_revenue: totalRevenue,
      };
    })
  );

  return listingsWithDetails;
};

const ListingsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hostFilter, setHostFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedListings, setSelectedListings] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingWithDetails | null>(null);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | 'flag' | 'ban'>('approve');

  const { data: listings, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: fetchAllListings,
  });

  const updateListingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ListingWithDetails> }) => {
      const { error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log de auditoría
      await supabase.from('admin_actions').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'listing_update',
        target_type: 'listing',
        target_id: id.toString(),
        details: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      toast.success('Anuncio actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating listing:', error);
      toast.error('Error al actualizar el anuncio');
    },
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log de auditoría
      await supabase.from('admin_actions').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'listing_delete',
        target_type: 'listing',
        target_id: id.toString(),
        details: { deleted: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      toast.success('Anuncio eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting listing:', error);
      toast.error('Error al eliminar el anuncio');
    },
  });

  // Filtrar anuncios
  const filteredListings = listings?.filter(listing => {
    const matchesSearch = 
      listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || listing.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && listing.is_active) ||
      (statusFilter === 'inactive' && !listing.is_active);

    const matchesHost = !hostFilter || 
      listing.profiles?.full_name?.toLowerCase().includes(hostFilter.toLowerCase()) ||
      listing.profiles?.email?.toLowerCase().includes(hostFilter.toLowerCase());

    const matchesPlan = planFilter === 'all' || 
      (planFilter === 'none' && !listing.subscription) ||
      listing.subscription?.plan === planFilter;

    return matchesSearch && matchesType && matchesStatus && matchesHost && matchesPlan;
  }) || [];

  const handleToggleActive = (listingId: number, currentStatus: boolean) => {
    updateListingMutation.mutate({
      id: listingId,
      updates: { is_active: !currentStatus },
    });
  };

  const handleDeleteListing = (listingId: number) => {
    deleteListingMutation.mutate(listingId);
  };

  const handleSelectListing = (listingId: number, checked: boolean) => {
    if (checked) {
      setSelectedListings(prev => [...prev, listingId]);
    } else {
      setSelectedListings(prev => prev.filter(id => id !== listingId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedListings(filteredListings.map(listing => listing.id));
    } else {
      setSelectedListings([]);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedListings.length === 0) {
      toast.error('Selecciona al menos un anuncio');
      return;
    }

    try {
      for (const listingId of selectedListings) {
        if (action === 'delete') {
          await deleteListingMutation.mutateAsync(listingId);
        } else {
          await updateListingMutation.mutateAsync({
            id: listingId,
            updates: { is_active: action === 'activate' },
          });
        }
      }
      setSelectedListings([]);
      toast.success(`${selectedListings.length} anuncios ${action === 'delete' ? 'eliminados' : action === 'activate' ? 'activados' : 'desactivados'}`);
    } catch (error) {
      toast.error('Error en la acción masiva');
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'accommodation' ? 
      <Home className="h-4 w-4 text-blue-500" title="Alojamiento" /> : 
      <Car className="h-4 w-4 text-green-500" title="Vehículo" />;
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge className="bg-green-100 text-green-800">Activo</Badge> : 
      <Badge variant="secondary">Inactivo</Badge>;
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

  const handleModerationAction = (listing: ListingWithDetails, action: 'approve' | 'reject' | 'flag' | 'ban') => {
    setSelectedListing(listing);
    setModerationAction(action);
    setShowModerationDialog(true);
  };

  const executeModerationAction = async () => {
    if (!selectedListing) return;

    try {
      switch (moderationAction) {
        case 'approve':
          await updateListingMutation.mutateAsync({
            id: selectedListing.id,
            updates: { is_active: true },
          });
          break;
        case 'reject':
          await updateListingMutation.mutateAsync({
            id: selectedListing.id,
            updates: { is_active: false },
          });
          break;
        case 'flag':
          // En producción, esto marcaría el anuncio para revisión
          toast.info('Anuncio marcado para revisión');
          break;
        case 'ban':
          // En producción, esto bloquearía al host temporalmente
          toast.info('Host bloqueado temporalmente');
          break;
      }
      setShowModerationDialog(false);
      setSelectedListing(null);
    } catch (error) {
      toast.error('Error en la acción de moderación');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Gestión de Anuncios</h1>
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
          <h2 className="text-xl font-bold mb-2">Error cargando anuncios</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
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
            <h1 className="text-2xl font-bold">Gestión de Anuncios</h1>
            <p className="text-muted-foreground">
              Administra todos los anuncios de la plataforma
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle>Filtros Avanzados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Título, ubicación, host..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="accommodation">Alojamientos</SelectItem>
                      <SelectItem value="vehicle">Vehículos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan Host</label>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los planes</SelectItem>
                      <SelectItem value="básico">Básico</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="diamante">Diamante</SelectItem>
                      <SelectItem value="none">Sin Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Host</label>
                  <Input
                    placeholder="Filtrar por host..."
                    value={hostFilter}
                    onChange={(e) => setHostFilter(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{listings?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total Anuncios</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {listings?.filter(l => l.is_active).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Activos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {listings?.reduce((sum, l) => sum + (l._count?.bookings || 0), 0) || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Reservas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-600">
                €{listings?.reduce((sum, l) => sum + (l.total_revenue || 0), 0).toFixed(0) || '0'}
              </div>
              <div className="text-sm text-muted-foreground">Ingresos Totales</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {listings?.filter(l => l.subscription?.plan === 'premium').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Hosts Premium</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {listings?.filter(l => l.subscription?.plan === 'diamante').length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Hosts Diamante</div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions */}
        {selectedListings.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">
                    {selectedListings.length} anuncio(s) seleccionado(s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('activate')}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Activar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('deactivate')}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Desactivar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Anuncios</AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que quieres eliminar {selectedListings.length} anuncio(s)? 
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleBulkAction('delete')}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listings Table */}
        <Card>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="w-12 p-4 text-left">
                      <Checkbox
                        checked={selectedListings.length === filteredListings.length && filteredListings.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left font-medium text-sm">Anuncio</th>
                    <th className="p-4 text-left font-medium text-sm">Host</th>
                    <th className="w-20 p-4 text-left font-medium text-sm">Plan</th>
                    <th className="w-24 p-4 text-left font-medium text-sm">Tipo</th>
                    <th className="w-24 p-4 text-left font-medium text-sm">Estado</th>
                    <th className="w-20 p-4 text-left font-medium text-sm">Métricas</th>
                    <th className="w-24 p-4 text-left font-medium text-sm">Precio</th>
                    <th className="w-32 p-4 text-left font-medium text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((listing) => (
                    <tr key={listing.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedListings.includes(listing.id)}
                          onCheckedChange={(checked) => handleSelectListing(listing.id, checked as boolean)}
                        />
                      </td>
                      
                      <td className="p-4">
                        <div className="space-y-1">
                          <h3 className="font-medium text-sm line-clamp-2">{listing.title}</h3>
                          <p className="text-xs text-muted-foreground">{listing.location}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(listing.created_at), 'dd/MM/yyyy', { locale: es })}
                          </p>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate">{listing.profiles?.full_name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground truncate">{listing.profiles?.email}</p>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        {getPlanBadge(listing.subscription)}
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          {getTypeIcon(listing.type)}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        {getStatusBadge(listing.is_active)}
                      </td>
                      
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-xs">{listing._count?.views || 0} vistas</div>
                          <div className="text-xs">{listing._count?.bookings || 0} reservas</div>
                          <div className="text-xs">€{(listing.total_revenue || 0).toFixed(0)}</div>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <span className="text-sm font-medium">€{listing.price_per_night_or_day}</span>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => window.open(`/listing/${listing.id}`, '_blank')}
                            title="Ver anuncio"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleModerationAction(listing, 'approve')}
                            title="Aprobar"
                          >
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleModerationAction(listing, 'reject')}
                            title="Rechazar"
                          >
                            <XCircle className="h-3 w-3 text-red-500" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleModerationAction(listing, 'flag')}
                            title="Marcar para revisión"
                          >
                            <Flag className="h-3 w-3 text-orange-500" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                title="Eliminar"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar Anuncio</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que quieres eliminar "{listing.title}"? 
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteListing(listing.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredListings.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No se encontraron anuncios con los filtros aplicados.
                  </p>
                </div>
              )}
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="lg:hidden space-y-4 p-4">
              {filteredListings.map((listing) => (
                <Card key={listing.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedListings.includes(listing.id)}
                          onCheckedChange={(checked) => handleSelectListing(listing.id, checked as boolean)}
                        />
                        <div className="flex items-center justify-center">
                          {getTypeIcon(listing.type)}
                        </div>
                      </div>
                      {getStatusBadge(listing.is_active)}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-medium text-sm mb-1">{listing.title}</h3>
                        <p className="text-xs text-muted-foreground">{listing.location}</p>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{listing.profiles?.full_name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">{listing.profiles?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">€{listing.price_per_night_or_day}</p>
                          <p className="text-xs text-muted-foreground">{listing._count?.bookings || 0} reservas</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(listing.created_at), 'dd/MM/yyyy', { locale: es })}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => window.open(`/listing/${listing.id}`, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => handleToggleActive(listing.id, listing.is_active)}
                          >
                            {listing.is_active ? 
                              <XCircle className="h-3 w-3 mr-1" /> : 
                              <CheckCircle className="h-3 w-3 mr-1" />
                            }
                            {listing.is_active ? 'Desactivar' : 'Activar'}
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar Anuncio</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que quieres eliminar "{listing.title}"? 
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteListing(listing.id)}
                                  className="bg-red-600 hover:bg-red-700"
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

              {filteredListings.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No se encontraron anuncios con los filtros aplicados.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Moderation Dialog */}
        <AlertDialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Acción de Moderación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres {' '}
                {moderationAction === 'approve' ? 'aprobar' : 
                 moderationAction === 'reject' ? 'rechazar' : 
                 moderationAction === 'flag' ? 'marcar para revisión' : 'bloquear el host de'} 
                {' '} el anuncio "{selectedListing?.title}"?
                {moderationAction === 'ban' && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-red-800 text-sm">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    Esta acción bloqueará temporalmente al host.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={executeModerationAction}
                className={moderationAction === 'ban' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default ListingsManager;