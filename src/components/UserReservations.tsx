import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Home, Car, Euro, Clock, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserBooking {
  id: number;
  listing_id: number;
  user_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  deposit_paid: boolean;
  status: 'confirmed' | 'pending_confirmation' | 'cancelled';
  created_at: string;
  listings: {
    id: number;
    title: string;
    location: string;
    type: string;
    images_urls: string[];
    host_id: string;
  };
  host_profile: {
    full_name: string;
    email: string;
  } | null;
}

const fetchUserBookings = async (userId: string) => {
  // Primero obtenemos las reservas del usuario
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  if (!bookings || bookings.length === 0) {
    return [];
  }

  // Obtener información de los listings
  const listingIds = [...new Set(bookings.map(booking => booking.listing_id))];
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, location, type, images_urls, host_id')
    .in('id', listingIds);

  // Obtener perfiles de los hosts
  const hostIds = [...new Set(listings?.map(listing => listing.host_id).filter(Boolean) || [])];
  const { data: hostProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', hostIds);

  // Combinar datos
  const bookingsWithHosts = bookings.map(booking => {
    const listing = listings?.find(l => l.id === booking.listing_id);
    const hostProfile = hostProfiles?.find(profile => profile.id === listing?.host_id);
    return {
      ...booking,
      listings: listing || null,
      host_profile: hostProfile || null
    };
  });

  return bookingsWithHosts as UserBooking[];
};

const UserReservations: React.FC = () => {
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['userBookings', session?.user?.id],
    queryFn: () => fetchUserBookings(session?.user?.id || ''),
    enabled: !!session?.user?.id,
  });

  // Debug: Log bookings to console
  React.useEffect(() => {
    if (bookings) {
      console.log('UserReservations Debug:', bookings);
      bookings.forEach(booking => {
        console.log(`Booking ${booking.id}: status=${booking.status}, created_at=${booking.created_at}`);
      });
    }
  }, [bookings]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: t('booking.statusConfirmed'), variant: 'default' as const },
      pending_confirmation: { label: t('booking.statusPending'), variant: 'secondary' as const },
      cancelled: { label: t('booking.statusCancelled'), variant: 'destructive' as const },
      rejected: { label: t('booking.statusRejected'), variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_confirmation;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calculateNights = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading || !session) {
    return <div className="text-center py-8">{t('pages.loading')}</div>;
  }

  if (isLoading) {
    return <div className="text-center py-8">{t('pages.loading')}</div>;
  }

  if (isError) {
    return <div className="text-center py-8 text-destructive">{t('pages.error')}</div>;
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('user.noBookingsTitle')}
        </h3>
        <p className="text-muted-foreground">
          {t('user.noBookingsDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          {t('user.myReservationsTitle')}
        </h2>
        <Badge variant="outline" className="px-3 py-1">
          {bookings.length} {t('user.totalBookings')}
        </Badge>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {booking.listings?.type === 'accommodation' ? (
                      <Home className="h-4 w-4" />
                    ) : (
                      <Car className="h-4 w-4" />
                    )}
                    {booking.listings?.title}
                  </CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1" />
                    {booking.listings?.location}
                  </div>
                </div>
                {getStatusBadge(booking.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Host Information */}
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {t('listing.hostedBy')} <span className="font-medium">
                    {booking.host_profile?.full_name || 
                     booking.host_profile?.email?.split('@')[0] || 
                     'Anfitrión'}
                  </span>
                </span>
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <div className="font-medium">{t('booking.dates')}</div>
                    <div className="text-muted-foreground">
                      {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {calculateNights(booking.start_date, booking.end_date)} {
                        booking.listings?.type === 'accommodation' ? t('booking.nights') : t('booking.days')
                      }
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <div className="font-medium">{t('booking.totalPrice')}</div>
                    <div className="text-lg font-bold text-primary">
                      €{booking.total_price.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="text-sm">
                  <div className="font-medium">{t('booking.depositStatus')}</div>
                  <div className={booking.deposit_paid ? 'text-green-600' : 'text-orange-600'}>
                    {booking.deposit_paid ? t('booking.depositPaid') : t('booking.depositPending')}
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {booking.status === 'pending_confirmation' && (
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    {t('user.pendingApproval')}
                  </p>
                </div>
              )}

              {booking.status === 'cancelled' && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {t('user.bookingRejected')}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                {t('booking.createdAt')}: {formatDate(booking.created_at)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserReservations;