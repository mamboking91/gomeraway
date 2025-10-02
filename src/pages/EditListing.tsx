import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, MapPin, Home, Car } from 'lucide-react';
import { toast } from 'sonner';

const listingSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres'),
  description: z.string().min(20, 'La descripción debe tener al menos 20 caracteres'),
  type: z.enum(['accommodation', 'vehicle']),
  location: z.string().min(3, 'La ubicación es requerida'),
  price_per_night_or_day: z.number().min(1, 'El precio debe ser mayor a 0'),
  is_active: z.boolean().default(true),
  // Campos para detalles específicos
  max_guests: z.number().min(1).optional(),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  vehicle_type: z.string().optional(),
  seats: z.number().min(1).optional(),
  amenities: z.string().optional(),
});

type ListingFormData = z.infer<typeof listingSchema>;

// Función para obtener el listing y sus detalles
const fetchListingWithDetails = async (id: string) => {
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (listingError) throw listingError;

  let details = {};
  
  if (listing.type === 'accommodation') {
    const { data: accommodationDetails } = await supabase
      .from('listing_details_accommodation')
      .select('*')
      .eq('listing_id', id)
      .single();
    
    if (accommodationDetails) {
      details = accommodationDetails;
    }
  } else if (listing.type === 'vehicle') {
    const { data: vehicleDetails } = await supabase
      .from('listing_details_vehicle')
      .select('*')
      .eq('listing_id', id)
      .single();
    
    if (vehicleDetails) {
      details = vehicleDetails;
    }
  }

  return { ...listing, ...details };
};

const EditListing = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
  });

  const watchType = form.watch('type');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate('/');
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

  // Obtener datos del listing
  const { data: listingData, isLoading: isLoadingListing } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => fetchListingWithDetails(id!),
    enabled: !!id && !!session,
  });

  // Poblar el formulario cuando lleguen los datos
  useEffect(() => {
    if (listingData) {
      form.reset({
        title: listingData.title,
        description: listingData.description || '',
        type: listingData.type,
        location: listingData.location || '',
        price_per_night_or_day: listingData.price_per_night_or_day,
        is_active: listingData.is_active,
        max_guests: listingData.max_guests || undefined,
        bedrooms: listingData.bedrooms || undefined,
        bathrooms: listingData.bathrooms || undefined,
        vehicle_type: listingData.vehicle_type || undefined,
        seats: listingData.seats || undefined,
        amenities: listingData.amenities || listingData.features || '',
      });
    }
  }, [listingData, form]);

  const onSubmit = async (data: ListingFormData) => {
    if (!session?.user?.id || !id) return;

    setSubmitting(true);
    try {
      // 1. Actualizar el listing principal
      const listingData = {
        title: data.title,
        description: data.description,
        type: data.type,
        location: data.location,
        price_per_night_or_day: data.price_per_night_or_day,
        is_active: data.is_active,
      };

      const { error: listingError } = await supabase
        .from('listings')
        .update(listingData)
        .eq('id', id);

      if (listingError) throw listingError;

      // 2. Actualizar detalles específicos
      if (data.type === 'accommodation') {
        const accommodationDetails = {
          listing_id: id,
          ...(data.max_guests && { max_guests: data.max_guests }),
          ...(data.bedrooms && { bedrooms: data.bedrooms }),
          ...(data.bathrooms && { bathrooms: data.bathrooms }),
          ...(data.amenities && { amenities: data.amenities }),
        };

        // Usar upsert para crear o actualizar
        const { error: detailsError } = await supabase
          .from('listing_details_accommodation')
          .upsert(accommodationDetails, { onConflict: 'listing_id' });

        if (detailsError) {
          console.warn('Error al actualizar detalles de alojamiento:', detailsError);
        }
      }

      if (data.type === 'vehicle') {
        const vehicleDetails = {
          listing_id: id,
          ...(data.vehicle_type && { vehicle_type: data.vehicle_type }),
          ...(data.seats && { seats: data.seats }),
          ...(data.amenities && { features: data.amenities }),
        };

        // Usar upsert para crear o actualizar
        const { error: detailsError } = await supabase
          .from('listing_details_vehicle')
          .upsert(vehicleDetails, { onConflict: 'listing_id' });

        if (detailsError) {
          console.warn('Error al actualizar detalles de vehículo:', detailsError);
        }
      }

      toast.success('Anuncio actualizado exitosamente');
      navigate('/dashboard/host');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al actualizar el anuncio: ' + errorMessage);
      console.error('Database error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || isLoadingListing) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>;
  }

  if (!session || !listingData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard/host')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Editar Anuncio
          </h1>
          <p className="text-muted-foreground">
            Actualiza la información de tu anuncio
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Tipo de Anuncio - Solo mostrar, no editable */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Anuncio</CardTitle>
                <CardDescription>
                  El tipo no se puede cambiar una vez creado el anuncio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                  {listingData.type === 'accommodation' ? (
                    <>
                      <Home className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">Alojamiento</h3>
                        <p className="text-sm text-muted-foreground">Casa, apartamento, habitación</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Car className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">Vehículo</h3>
                        <p className="text-sm text-muted-foreground">Coche, moto, bicicleta</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información Básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>
                  Información general de tu {watchType === 'accommodation' ? 'alojamiento' : 'vehículo'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <MapPin className="inline w-4 h-4 mr-1" />
                          Ubicación
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price_per_night_or_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Precio por {watchType === 'accommodation' ? 'noche' : 'día'} (€)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Detalles Específicos */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Detalles {watchType === 'accommodation' ? 'del Alojamiento' : 'del Vehículo'}
                </CardTitle>
                <CardDescription>
                  Información específica para ayudar a los huéspedes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {watchType === 'accommodation' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="max_guests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máximo de Huéspedes</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dormitorios</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Baños</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicle_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Vehículo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="car">Coche</SelectItem>
                              <SelectItem value="suv">SUV</SelectItem>
                              <SelectItem value="van">Furgoneta</SelectItem>
                              <SelectItem value="motorcycle">Motocicleta</SelectItem>
                              <SelectItem value="bike">Bicicleta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Asientos</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {watchType === 'accommodation' ? 'Servicios y Comodidades' : 'Características'}
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={watchType === 'accommodation' 
                              ? "Wifi, aire acondicionado, cocina, piscina, parking..."
                              : "GPS, aire acondicionado, bluetooth, asientos de cuero..."
                            }
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Separa cada elemento con comas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuración */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Anuncio Activo
                        </FormLabel>
                        <FormDescription>
                          Tu anuncio será visible para los huéspedes
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Botones de Acción */}
            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/dashboard/host')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      
      <Footer />
    </div>
  );
};

export default EditListing;