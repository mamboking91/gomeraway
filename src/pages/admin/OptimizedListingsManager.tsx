import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/admin/AdminLayout';
import Pagination from '@/components/Pagination';
import { ComponentLoader } from '@/components/LoadingSpinner';
import { useListingsPagination, useSearchPagination } from '@/hooks/usePagination';
import { Search, Eye, Edit, Trash2, MoreHorizontal, MapPin, Euro } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night_or_day: number;
  type: 'accommodation' | 'vehicle';
  is_active: boolean;
}

const OptimizedListingsManager: React.FC = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [pageSize, setPageSize] = useState(20);

  // Paginación principal con filtros
  const {
    data: listings,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    isLoading,
    error,
    refresh
  } = useListingsPagination(
    {
      ...(typeFilter && { type: typeFilter as 'accommodation' | 'vehicle' }),
      ...(statusFilter && { is_active: statusFilter === 'active' })
    },
    { pageSize }
  );

  // Búsqueda con paginación (alternativa cuando hay término de búsqueda)
  const searchResults = useSearchPagination(
    searchTerm,
    ['title', 'description', 'location'],
    'listings',
    { pageSize }
  );

  // Usar resultados de búsqueda o listado normal
  const activeResults = searchTerm.trim() ? searchResults : {
    data: listings,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    isLoading,
    error,
    refresh
  };

  const handleStatusChange = async (listingId: string, newStatus: boolean) => {
    try {
      // Aquí iría la lógica de actualización
      console.log(`Updating listing ${listingId} to ${newStatus ? 'active' : 'inactive'}`);
      refresh(); // Refrescar datos después de la actualización
    } catch (error) {
      console.error('Error updating listing status:', error);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este anuncio?')) {
      try {
        // Aquí iría la lógica de eliminación
        console.log(`Deleting listing ${listingId}`);
        refresh();
      } catch (error) {
        console.error('Error deleting listing:', error);
      }
    }
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <ComponentLoader text="Verificando permisos..." />
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
            <h1 className="text-3xl font-bold">Gestión de Anuncios</h1>
            <p className="text-muted-foreground">
              Administra todos los anuncios de la plataforma con paginación optimizada
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh}>
              Actualizar
            </Button>
            <Button>
              Crear Anuncio
            </Button>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
            <CardDescription>
              Usa los filtros para encontrar anuncios específicos de forma eficiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtro por tipo */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de anuncio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los tipos</SelectItem>
                  <SelectItem value="accommodation">Alojamiento</SelectItem>
                  <SelectItem value="vehicle">Vehículo</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por estado */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>

              {/* Limpiar filtros */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('');
                  setStatusFilter('');
                }}
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">Total anuncios</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{activeResults.data.length}</div>
              <p className="text-xs text-muted-foreground">En esta página</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{pageSize}</div>
              <p className="text-xs text-muted-foreground">Por página</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{totalPages}</div>
              <p className="text-xs text-muted-foreground">Total páginas</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Anuncios */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Anuncios {searchTerm && `- Búsqueda: "${searchTerm}"`}
              </CardTitle>
              <Badge variant="outline">
                Página {currentPage} de {totalPages}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activeResults.isLoading ? (
              <ComponentLoader text="Cargando anuncios..." />
            ) : activeResults.error ? (
              <div className="text-center py-8">
                <p className="text-red-500">Error al cargar anuncios: {activeResults.error.message}</p>
                <Button variant="outline" onClick={refresh} className="mt-2">
                  Reintentar
                </Button>
              </div>
            ) : activeResults.data.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No se encontraron anuncios para la búsqueda' : 'No hay anuncios disponibles'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeResults.data.map((listing: Listing) => (
                  <div key={listing.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{listing.title}</h3>
                          <Badge variant={listing.is_active ? "default" : "secondary"}>
                            {listing.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <Badge variant="outline">
                            {listing.type === 'accommodation' ? 'Alojamiento' : 'Vehículo'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {listing.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {listing.price_per_night_or_day}/noche
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {listing.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleStatusChange(listing.id, !listing.is_active)}
                        >
                          {listing.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(listing.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paginación */}
        {!activeResults.isLoading && activeResults.data.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={activeResults.goToPage}
            onPageSizeChange={setPageSize}
            showPageSizeSelector={true}
            showInfo={true}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default OptimizedListingsManager;