import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  role: 'user' | 'host' | 'admin';
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });

  const createOrUpdateProfile = async (user: User) => {
    try {
      // Verificar si ya existe el perfil
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error diferente a "no encontrado"
        throw fetchError;
      }

      if (!existingProfile) {
        // Crear nuevo perfil
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
            phone: user.user_metadata?.phone || null,
            role: 'user',
            profile_completed: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newProfile;
      } else {
        // Actualizar email si cambió
        if (existingProfile.email !== user.email) {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ email: user.email || existingProfile.email })
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) throw updateError;
          return updatedProfile;
        }
        return existingProfile;
      }
    } catch (error) {
      console.error('Error creating/updating profile:', error);
      throw error;
    }
  };

  const updateAuthState = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Crear o actualizar perfil automáticamente
      const profile = await createOrUpdateProfile(session.user);

      setState({
        user: session.user,
        profile,
        session,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error updating auth state:', error);
      setState({
        user: session.user,
        profile: null,
        session,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }, []);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        updateAuthState(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [updateAuthState]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!state.user) throw new Error('No hay usuario autenticado');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id)
      .select()
      .single();

    if (error) throw error;

    setState(prev => ({
      ...prev,
      profile: data,
    }));

    return data;
  };

  const checkProfileCompletion = (profile: Profile | null): boolean => {
    if (!profile) return false;
    
    const requiredFields = [
      'full_name',
      'phone',
      'address',
      'city',
      'country',
      'date_of_birth'
    ];

    return requiredFields.every(field => 
      profile[field as keyof Profile] && 
      profile[field as keyof Profile] !== ''
    );
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    ...state,
    updateProfile,
    checkProfileCompletion: () => checkProfileCompletion(state.profile),
    isProfileComplete: state.profile ? checkProfileCompletion(state.profile) : false,
    logout,
  };
};