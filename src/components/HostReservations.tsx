import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedImage } from '@/components/OptimizedImage';
import { getSupabaseImageUrl } from '@/utils/imageUtils';
import { CalendarDays, MapPin, User, Euro, Check, X, Home, Car } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface Booking {
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
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

const fetchHostBookings = async (hostId: string) => {
  // First get all listings for this host
  const { data: hostListings, error: listingsError } = await supabase
    .from('listings')
    .select('id')
    .eq('host_id', hostId);

  if (listingsError) {
    throw new Error(listingsError.message);
  }

  if (!hostListings || hostListings.length === 0) {
    return [];
  }

  const listingIds = hostListings.map(listing => listing.id);

  // Then get bookings for those listings
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false });

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  if (!bookings || bookings.length === 0) {
    return [];
  }

  // Get listings info
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, location, type, images_urls')
    .in('id', listingIds);

  // Get guest profiles
  const guestIds = [...new Set(bookings.map(booking => booking.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', guestIds);

  // Combine data
  const data = bookings.map(booking => {
    const listing = listings?.find(l => l.id === booking.listing_id);
    const profile = profiles?.find(p => p.id === booking.user_id);
    return {
      ...booking,
      listings: listing || null,
      profiles: profile || null
    };
  });

  return data as Booking[];
};

const HostReservations: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
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
    queryKey: ['hostBookings', session?.user?.id],
    queryFn: () => fetchHostBookings(session?.user?.id || ''),
    enabled: !!session?.user?.id,
  });


  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostBookings'] });
      queryClient.invalidateQueries({ queryKey: ['host-stats'] });
      toast.success(t('host.bookingStatusUpdated'));
    },
    onError: (error) => {
      toast.error(t('host.bookingStatusError'));
    },
  });

  const handleAcceptBooking = (bookingId: number) => {
    updateBookingStatusMutation.mutate({ bookingId, status: 'confirmed' });
  };

  const handleRejectBooking = (bookingId: number) => {
    updateBookingStatusMutation.mutate({ bookingId, status: 'cancelled' });
  };

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
          {t('host.noBookingsTitle')}
        </h3>
        <p className="text-muted-foreground">
          {t('host.noBookingsDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          {t('host.reservationsTitle')}
        </h2>
        <Badge variant="outline" className="px-3 py-1">
          {bookings.length} {t('host.totalBookings')}
        </Badge>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex space-x-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative bg-muted">
                    <OptimizedImage
                      src={getSupabaseImageUrl(
                        booking.listings?.images_urls && booking.listings.images_urls.length > 0 
                          ? booking.listings.images_urls[0] 
                          : null
                      ).url}
                      alt={booking.listings?.title || 'Anuncio'}
                      className="w-full h-full object-cover"
                      aspectRatio="square"
                      sizes="80px"
                      fallback={`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23f3f4f6"/><g transform="translate(20,20)">${booking.listings?.type === 'accommodation' ? '<path d="M3 9v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" stroke="%236b7280" stroke-width="2" fill="none"/><path d="M21 9l-6-6H5L3 9" stroke="%236b7280" stroke-width="2" fill="none"/>' : '<path d="M3 14h18l-9-8-9 8z" stroke="%236b7280" stroke-width="2" fill="none"/><path d="M3 14h18v7H3z" stroke="%236b7280" stroke-width="2" fill="none"/><circle cx="8" cy="18" r="2" stroke="%236b7280" stroke-width="2" fill="none"/><circle cx="16" cy="18" r="2" stroke="%236b7280" stroke-width="2" fill="none"/>'}</g></svg>`}
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">
                      {booking.listings?.title || 'Anuncio'}
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {booking.listings?.location || 'Ubicación no disponible'}
                    </div>
                  </div>
                </div>
                {getStatusBadge(booking.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Guest Information */}
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {booking.profiles?.full_name || 
                   booking.profiles?.email?.split('@')[0] || 
                   'Huésped'}
                </span>
                {booking.profiles?.email && (
                  <span className="text-sm text-muted-foreground">
                    ({booking.profiles.email})
                  </span>
                )}
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
                      {calculateNights(booking.start_date, booking.end_date)} {t('booking.nights')}
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

              {/* Action Buttons */}
              {booking.status === 'pending_confirmation' && (
                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcceptBooking(booking.id)}
                    disabled={updateBookingStatusMutation.isPending}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t('booking.accept')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejectBooking(booking.id)}
                    disabled={updateBookingStatusMutation.isPending}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t('booking.reject')}
                  </Button>
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

export default HostReservations;