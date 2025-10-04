import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  error: Error | null;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  refresh: () => void;
}

// Hook genérico para paginación con Supabase
export function usePagination<T>(
  tableName: string,
  options: PaginationOptions = {},
  filters: Record<string, unknown> = {},
  select: string = '*'
): PaginatedResult<T> {
  const { pageSize = 20, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Query para obtener el total de registros
  const { data: totalCount = 0 } = useQuery({
    queryKey: [`${tableName}-count`, filters],
    queryFn: async () => {
      let countQuery = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          countQuery = countQuery.eq(key, value);
        }
      });

      const { count, error } = await countQuery;
      if (error) throw error;
      return count || 0;
    },
  });

  // Query para obtener los datos paginados
  const {
    data: items = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [`${tableName}-paginated`, currentPage, pageSize, filters, select],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let dataQuery = supabase
        .from(tableName)
        .select(select)
        .range(from, to)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          dataQuery = dataQuery.eq(key, value);
        }
      });

      const { data, error } = await dataQuery;
      if (error) throw error;
      return data || [];
    },
    enabled: totalCount !== undefined,
  });

  // Cálculos derivados
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Funciones de navegación
  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const refresh = () => {
    refetch();
  };

  return {
    data: items,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    nextPage,
    previousPage,
    goToPage,
    refresh,
  };
}

// Hook especializado para listings
export function useListingsPagination(
  filters: {
    type?: 'accommodation' | 'vehicle';
    is_active?: boolean;
    host_id?: string;
  } = {},
  options: PaginationOptions = {}
) {
  return usePagination(
    'listings',
    options,
    filters,
    `
      *,
      listing_details_accommodation(*),
      listing_details_vehicle(*)
    `
  );
}

// Hook especializado para bookings (admin)
export function useBookingsPagination(
  filters: {
    status?: string;
    user_id?: string;
    listing_id?: string;
  } = {},
  options: PaginationOptions = {}
) {
  return usePagination(
    'bookings',
    options,
    filters,
    `
      *,
      listings(title, type, host_id),
      profiles(full_name, email)
    `
  );
}

// Hook especializado para usuarios (admin)
export function useUsersPagination(
  filters: {
    role?: string;
  } = {},
  options: PaginationOptions = {}
) {
  return usePagination(
    'profiles',
    options,
    filters,
    '*'
  );
}

// Hook especializado para suscripciones (admin)
export function useSubscriptionsPagination(
  filters: {
    status?: string;
    plan?: string;
  } = {},
  options: PaginationOptions = {}
) {
  return usePagination(
    'subscriptions',
    options,
    filters,
    `
      *,
      profiles(full_name, email)
    `
  );
}

// Hook para búsqueda con paginación
export function useSearchPagination<T>(
  searchTerm: string,
  searchColumns: string[],
  tableName: string,
  options: PaginationOptions = {}
) {
  const [currentPage, setCurrentPage] = useState(1);
  const { pageSize = 20 } = options;

  const {
    data: result,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [`${tableName}-search`, searchTerm, currentPage, pageSize],
    queryFn: async () => {
      if (!searchTerm.trim()) {
        return { data: [], count: 0 };
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      // Construir query de búsqueda
      let searchQuery = supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      // Agregar condiciones de búsqueda para cada columna
      searchColumns.forEach((column, index) => {
        if (index === 0) {
          searchQuery = searchQuery.ilike(column, `%${searchTerm}%`);
        } else {
          searchQuery = searchQuery.or(`${column}.ilike.%${searchTerm}%`);
        }
      });

      const { data, count, error } = await searchQuery;
      if (error) throw error;

      return { data: data || [], count: count || 0 };
    },
    enabled: !!searchTerm.trim(),
  });

  const data = result?.data || [];
  const totalCount = result?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const nextPage = () => {
    if (hasNextPage) setCurrentPage(prev => prev + 1);
  };

  const previousPage = () => {
    if (hasPreviousPage) setCurrentPage(prev => prev - 1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return {
    data,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    nextPage,
    previousPage,
    goToPage,
    refresh: refetch,
  };
}

export default usePagination;