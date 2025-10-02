import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: false,
    loading: true,
    error: null,
  });

  const checkAdminStatus = async (user: User | null) => {
    if (!user) {
      setState({
        user: null,
        isAdmin: false,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      // Verificar el rol del usuario en la tabla profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        setState({
          user,
          isAdmin: false,
          loading: false,
          error: 'Error verificando permisos de administrador',
        });
        return;
      }

      const isAdmin = profile?.role === 'admin';

      setState({
        user,
        isAdmin,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setState({
        user,
        isAdmin: false,
        loading: false,
        error: 'Error verificando permisos',
      });
    }
  };

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdminStatus(session?.user || null);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        checkAdminStatus(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return state;
};

// Hook para verificar si el usuario actual es admin (más simple)
export const useIsAdmin = () => {
  const { isAdmin, loading } = useAdminAuth();
  return { isAdmin, loading };
};

// Hook para requerir permisos de admin con redirect
export const useRequireAdmin = (redirectTo: string = '/') => {
  const { user, isAdmin, loading, error } = useAdminAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      // Redirigir si no es admin después de cargar
      window.location.href = redirectTo;
    }
  }, [user, isAdmin, loading, redirectTo]);

  return { user, isAdmin, loading, error };
};