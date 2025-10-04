import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import { MapPin, Users, Settings, Fuel, AlertTriangle } from 'lucide-react';
import { ImageGallery } from '@/components/OptimizedImage';
import { getSupabaseImageUrls } from '@/utils/imageUtils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { addDays, differenceInCalendarDays, eachDayOfInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Query para los detalles del anuncio
const fetchListingDetails = async (id: string) => {
  const { data, error } = await supabase
    .from('listings')
    .select(`*, listing_details_accommodation(*), listing_details_vehicle(*)`)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Query para obtener las reservas existentes
const fetchBookings = async (listingId: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('start_date, end_date')
    .eq('listing_id', listingId)
    .eq('status', 'confirmed');

  if (error) throw new Error(error.message);
  return data;
};

const ListingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile, isProfileComplete } = useAuth();
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [numberOfDays, setNumberOfDays] = useState<number>(0);

  // Query para los detalles del anuncio
  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => fetchListingDetails(id!),
    enabled: !!id,
  });

  // Query para las reservas
  const { data: bookings } = useQuery({
    queryKey: ['bookings', id],
    queryFn: () => fetchBookings(id!),
    enabled: !!id,
  });

  // Calculamos las fechas deshabilitadas a partir de las reservas
  const disabledDates = useMemo(() => {
    if (!bookings) return [];
    const dates: Date[] = [];
    bookings.forEach(booking => {
      const interval = eachDayOfInterval({
        start: new Date(booking.start_date),
        end: new Date(booking.end_date)
      });
      dates.push(...interval);
    });
    return dates;
  }, [bookings]);

  useEffect(() => {
    if (listing && range?.from && range?.to) {
      const days = differenceInCalendarDays(range.to, range.from);
      if (days > 0) {
        const price = parseFloat(String(listing.price_per_night_or_day));
        setNumberOfDays(days);
        setTotalPrice(days * price);
      } else {
        setNumberOfDays(0);
        setTotalPrice(0);
      }
    } else {
      setNumberOfDays(0);
      setTotalPrice(0);
    }
  }, [range, listing]);

  const handleBooking = async () => {
    setLoadingBooking(true);

    // Verificar autenticación
    if (!user) {
      toast.error("Por favor, inicia sesión para hacer una reserva.");
      setLoadingBooking(false);
      return;
    }

    // Verificar perfil completo
    if (!isProfileComplete) {
      setShowProfileModal(true);
      setLoadingBooking(false);
      return;
    }

    // Verificar fechas
    if (!range?.from || !range?.to || !listing || totalPrice === null) {
      toast.error("Por favor, selecciona un rango de fechas válido.");
      setLoadingBooking(false);
      return;
    }

    const bookingDetails = {
      listing: { id: listing.id, title: listing.title },
      range: {
        from: range.from.toISOString().split('T')[0],
        to: range.to.toISOString().split('T')[0],
      },
      totalPrice: totalPrice,
      deposit: totalPrice * 0.10,
    };

    const { data, error } = await supabase.functions.invoke('create-booking-checkout', {
      body: bookingDetails,
    });

    if (error) {
      toast.error(`Error al crear la reserva: ${error.message}`);
      setLoadingBooking(false);
      return;
    }

    window.location.href = data.url;
  };

  const handleProfileComplete = () => {
    setShowProfileModal(false);
    // Después de completar el perfil, el usuario puede intentar la reserva de nuevo
    toast.success('¡Perfil completado! Ahora puedes continuar con la reserva.');
  };

  // Get image URLs using improved helper
  const imageUrls = getSupabaseImageUrls(listing?.images_urls);

  if (isLoading) return <div>Cargando...</div>;
  if (isError || !listing) return <div>Error: No se pudo encontrar el anuncio.</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl shadow-strong p-6">
          <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
          <div className="flex items-center text-muted-foreground mb-4">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{listing.location}</span>
          </div>
          <ImageGallery
            images={imageUrls}
            title={listing.title}
            className="mb-6"
            maxHeight="500px"
            showThumbnails={imageUrls.length > 1}
          />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-3">
              {/* 👇 CÓDIGO RESTAURADO AQUÍ 👇 */}
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Descripción</h2>
              <p className="text-foreground">{listing.description}</p>
              
              <h2 className="text-2xl font-semibold border-b pb-2 my-4">Detalles</h2>
              {listing.type === 'accommodation' && listing.listing_details_accommodation && (
                <div className="space-y-2 text-foreground">
                  <div className="flex items-center"><Users className="h-4 w-4 mr-2" /> {listing.listing_details_accommodation.guests} huéspedes</div>
                  <div>{listing.listing_details_accommodation.bedrooms} dormitorios</div>
                  <div>{listing.listing_details_accommodation.bathrooms} baños</div>
                </div>
              )}
              {listing.type === 'vehicle' && listing.listing_details_vehicle && (
                 <div className="space-y-2 text-foreground">
                  <div className="flex items-center"><Users className="h-4 w-4 mr-2" /> {listing.listing_details_vehicle.seats} asientos</div>
                  <div className="flex items-center"><Fuel className="h-4 w-4 mr-2" /> {listing.listing_details_vehicle.fuel}</div>
                  <div className="flex items-center"><Settings className="h-4 w-4 mr-2" /> {listing.listing_details_vehicle.transmission}</div>
                </div>
              )}
              {/* 👆 FIN DEL CÓDIGO RESTAURADO 👆 */}
            </div>
            
            <div className="md:col-span-2">
              <div className="border rounded-xl p-4 shadow-soft sticky top-24 w-full">
                 <h3 className="text-lg font-semibold mb-4">Selecciona tus fechas</h3>
                 <Calendar
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={1}
                    disabled={[...disabledDates, { before: today }]}
                 />
                 <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground">€{listing.price_per_night_or_day} x {numberOfDays} {listing.type === 'accommodation' ? 'noches' : 'días'}</span>
                      <span className="font-semibold">€{totalPrice}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                      <span>Depósito (10%)</span>
                      <span className="font-semibold">€{totalPrice ? (totalPrice * 0.10).toFixed(2) : '0.00'}</span>
                    </div>
                 </div>
                <Button onClick={handleBooking} disabled={loadingBooking} className="w-full mt-4 bg-gradient-primary hover:opacity-90">
                  {loadingBooking ? 'Procesando...' : 'Reservar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onComplete={handleProfileComplete}
      />
    </div>
  );
};

export default ListingDetailPage;
