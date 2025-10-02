import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, PartyPopper, CalendarDays, MapPin, Euro, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingSummary {
  id: number;
  listing_id: number;
  start_date: string;
  end_date: string;
  total_price: number;
  deposit_paid: boolean;
  status: string;
  created_at: string;
  listings: {
    title: string;
    location: string;
    type: string;
    images_urls: string[];
  } | null;
}

const PaymentSuccessPage = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  const type = searchParams.get('type'); // 'subscription' o 'booking'

  useEffect(() => {
    if (type === 'booking') {
      fetchLatestBooking();
    } else {
      setLoading(false);
    }
  }, [type]);

  const fetchLatestBooking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener la reserva más reciente del usuario
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (bookingError || !bookingData) {
        console.error('Error fetching booking:', bookingError);
        setLoading(false);
        return;
      }

      // Obtener información del listing
      const { data: listingData } = await supabase
        .from('listings')
        .select('title, location, type, images_urls')
        .eq('id', bookingData.listing_id)
        .single();

      setBooking({
        ...bookingData,
        listings: listingData
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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

  const content = {
    subscription: {
      icon: <PartyPopper className="mx-auto h-16 w-16 text-green-500 mb-4" />,
      title: '¡Suscripción Activada!',
      message: 'Gracias por unirte a GomeraWay. Ya puedes empezar a crear tus anuncios.',
      linkText: 'Ir a mi panel',
      linkTo: '/dashboard',
    },
    booking: {
      icon: <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />,
      title: '¡Reserva Creada!',
      message: 'Tu pago ha sido procesado correctamente. Tu reserva está pendiente de confirmación del anfitrión.',
      linkText: 'Ver mis reservas',
      linkTo: '/dashboard/user?tab=reservations',
    },
  };

  const currentContent = type === 'subscription' ? content.subscription : content.booking;

  if (type === 'booking' && loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando detalles de la reserva...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            {currentContent.icon}
            <h1 className="text-3xl font-bold mb-2">{currentContent.title}</h1>
            <p className="text-muted-foreground mb-6">{currentContent.message}</p>
          </div>

          {/* Mostrar resumen de reserva si es un booking */}
          {type === 'booking' && booking && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl text-center">Resumen de tu Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Información del alojamiento */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-2">{booking.listings?.title}</h3>
                  <div className="flex items-center text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{booking.listings?.location}</span>
                  </div>
                </div>

                {/* Detalles de la reserva */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="font-medium">Fechas</div>
                      <div className="text-muted-foreground">
                        {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {calculateNights(booking.start_date, booking.end_date)} noches
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="font-medium">Precio Total</div>
                      <div className="text-lg font-bold text-primary">
                        €{booking.total_price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estado de la reserva */}
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800">Estado: Pendiente de Confirmación</div>
                    <div className="text-yellow-700">El anfitrión revisará tu solicitud y te confirmará pronto.</div>
                  </div>
                </div>

                {/* Información de pago */}
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium">✅ Depósito pagado: €{(booking.total_price * 0.10).toFixed(2)}</div>
                  <div>Número de reserva: #{booking.id}</div>
                  <div>Fecha de solicitud: {formatDate(booking.created_at)}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center">
            <Link 
              to={currentContent.linkTo} 
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {currentContent.linkText}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;
