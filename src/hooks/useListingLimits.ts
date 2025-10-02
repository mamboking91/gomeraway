import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ListingLimits {
  canCreate: boolean;
  currentCount: number;
  maxAllowed: number;
  planName: string;
  isUnlimited: boolean;
  message?: string;
  loading: boolean;
  error: string | null;
}

export const useListingLimits = () => {
  const [limits, setLimits] = useState<ListingLimits>({
    canCreate: false,
    currentCount: 0,
    maxAllowed: 0,
    planName: 'none',
    isUnlimited: false,
    loading: true,
    error: null,
  });

  const checkLimits = async () => {
    try {
      setLimits(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-listing-limits');

      if (error) {
        throw new Error(error.message || 'Error checking listing limits');
      }

      setLimits({
        ...data,
        loading: false,
        error: null,
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setLimits(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  useEffect(() => {
    checkLimits();
  }, []);

  return {
    ...limits,
    refetch: checkLimits,
  };
};

// Hook para verificar límites antes de una acción específica
export const useCanCreateListing = () => {
  const checkCanCreate = async (): Promise<{ canCreate: boolean; message?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-listing-limits');

      if (error) {
        throw new Error(error.message || 'Error checking listing limits');
      }

      return {
        canCreate: data.canCreate,
        message: data.message,
      };
    } catch (error) {
      console.error('Error checking if can create listing:', error);
      return {
        canCreate: false,
        message: 'Error verificando límites. Por favor intenta de nuevo.',
      };
    }
  };

  return { checkCanCreate };
};