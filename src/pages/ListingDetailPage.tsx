import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import { MapPin, Users, Settings, Fuel, AlertTriangle, Home, Bath, Car, Zap, Cog } from 'lucide-react';
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
                <div className="space-y-3 text-foreground">
                  {/* Información básica de la propiedad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <Users className="h-5 w-5 mr-3 text-green-600" /> 
                      <div>
                        <span className="text-sm text-gray-600">Capacidad</span>
                        <div className="font-medium">{listing.listing_details_accommodation.max_guests || listing.listing_details_accommodation.guests} huéspedes</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <Home className="h-5 w-5 mr-3 text-blue-600" /> 
                      <div>
                        <span className="text-sm text-gray-600">Dormitorios</span>
                        <div className="font-medium">{listing.listing_details_accommodation.bedrooms} dormitorios</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <Bath className="h-5 w-5 mr-3 text-cyan-600" /> 
                      <div>
                        <span className="text-sm text-gray-600">Baños</span>
                        <div className="font-medium">{listing.listing_details_accommodation.bathrooms} baños</div>
                      </div>
                    </div>
                  </div>

                  {/* Servicios y comodidades */}
                  {listing.listing_details_accommodation.features && Array.isArray(listing.listing_details_accommodation.features) && listing.listing_details_accommodation.features.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-semibold text-lg mb-3 flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-blue-600" />
                        Servicios y Comodidades
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {listing.listing_details_accommodation.features.map((feature, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {listing.type === 'vehicle' && listing.listing_details_vehicle && (
                 <div className="space-y-3 text-foreground">
                  {/* Información básica del vehículo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {listing.listing_details_vehicle.vehicle_type && (
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Car className="h-5 w-5 mr-3 text-blue-600" /> 
                        <div>
                          <span className="text-sm text-gray-600">Tipo de vehículo</span>
                          <div className="font-medium">
                            {listing.listing_details_vehicle.vehicle_type === 'car' ? 'Coche' : 
                            listing.listing_details_vehicle.vehicle_type === 'suv' ? 'SUV' :
                            listing.listing_details_vehicle.vehicle_type === 'van' ? 'Furgoneta' :
                            listing.listing_details_vehicle.vehicle_type === 'motorcycle' ? 'Motocicleta' :
                            listing.listing_details_vehicle.vehicle_type === 'bike' ? 'Bicicleta' :
                            listing.listing_details_vehicle.vehicle_type}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                      <Users className="h-5 w-5 mr-3 text-green-600" /> 
                      <div>
                        <span className="text-sm text-gray-600">Capacidad</span>
                        <div className="font-medium">{listing.listing_details_vehicle.seats} asientos</div>
                      </div>
                    </div>
                  </div>

                  {/* Especificaciones técnicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {listing.listing_details_vehicle.fuel && (
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        {listing.listing_details_vehicle.fuel === 'electric' ? (
                          <Zap className="h-5 w-5 mr-3 text-yellow-600" />
                        ) : (
                          <Fuel className="h-5 w-5 mr-3 text-orange-600" />
                        )}
                        <div>
                          <span className="text-sm text-gray-600">Combustible</span>
                          <div className="font-medium">
                            {listing.listing_details_vehicle.fuel === 'gasoline' ? 'Gasolina' :
                            listing.listing_details_vehicle.fuel === 'diesel' ? 'Diesel' :
                            listing.listing_details_vehicle.fuel === 'electric' ? 'Eléctrico' :
                            listing.listing_details_vehicle.fuel === 'hybrid' ? 'Híbrido' :
                            listing.listing_details_vehicle.fuel === 'none' ? 'Sin motor' :
                            listing.listing_details_vehicle.fuel}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {listing.listing_details_vehicle.transmission && (
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Cog className="h-5 w-5 mr-3 text-purple-600" /> 
                        <div>
                          <span className="text-sm text-gray-600">Transmisión</span>
                          <div className="font-medium">
                            {listing.listing_details_vehicle.transmission === 'manual' ? 'Manual' :
                            listing.listing_details_vehicle.transmission === 'automatic' ? 'Automática' :
                            listing.listing_details_vehicle.transmission === 'none' ? 'Sin transmisión' :
                            listing.listing_details_vehicle.transmission}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Características adicionales */}
                  {listing.listing_details_vehicle.features && Array.isArray(listing.listing_details_vehicle.features) && listing.listing_details_vehicle.features.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-semibold text-lg mb-3 flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-blue-600" />
                        Características del Vehículo
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {listing.listing_details_vehicle.features.map((feature, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
