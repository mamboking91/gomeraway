import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/header';
import Footer from '@/components/footer';
import UserReservations from '@/components/UserReservations';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { 
  Calendar, 
  CheckCircle, 
  Clock,
  XCircle,
  Euro
} from 'lucide-react';

// Función para obtener estadísticas del usuario
const fetchUserStats = async (userId: string) => {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const stats = {
    totalBookings: bookings?.length || 0,
    confirmedBookings: bookings?.filter(b => b.status === 'confirmed').length || 0,
    pendingBookings: bookings?.filter(b => b.status === 'pending').length || 0,
    totalSpent: bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0,
  };

  return stats;
};

const UserDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Obtener estadísticas del usuario
  const { data: stats } = useQuery({
    queryKey: ['user-stats', session?.user?.id],
    queryFn: () => fetchUserStats(session?.user?.id || ''),
    enabled: !!session?.user?.id,
  });

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('user.dashboardTitle')}
          </h1>
          <p className="text-muted-foreground">
            {t('user.dashboardSubtitle')}
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('user.totalBookings')}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
              <p className="text-xs text-muted-foreground">
                {t('user.reservationsTotal')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('user.confirmedBookings')}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.confirmedBookings || 0}</div>
              <p className="text-xs text-muted-foreground">
                {t('booking.statusConfirmed')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('user.pendingBookings')}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingBookings || 0}</div>
              <p className="text-xs text-muted-foreground">
                {t('user.awaitingConfirmation')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('user.totalSpent')}
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats?.totalSpent?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                {t('user.totalAmount')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="reservations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="reservations">{t('user.myReservations')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="reservations" className="space-y-4">
            <UserReservations />
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
};

export default UserDashboard;