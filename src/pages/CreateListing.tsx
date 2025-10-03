import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { ArrowLeft, Upload, MapPin, Home, Car, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useListingLimits, useCanCreateListing } from '@/hooks/useListingLimits';
import LimitIndicator from '@/components/LimitIndicator';
import ImageUpload from '@/components/ImageUpload';

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

const CreateListing = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  // Hooks para verificar límites
  const limits = useListingLimits();
  const { checkCanCreate } = useCanCreateListing();

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      type: 'accommodation',
      is_active: true,
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      seats: 4,
    },
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

  const onSubmit = async (data: ListingFormData) => {
    if (!session?.user?.id) return;

    setSubmitting(true);
    try {
      // 🔒 Verificar límites de anuncios antes de crear
      const limitsCheck = await checkCanCreate();
      if (!limitsCheck.canCreate) {
        toast.error(limitsCheck.message || 'No puedes crear más anuncios con tu plan actual');
        setSubmitting(false);
        return;
      }
      // 1. Crear el listing principal
      const listingData = {
        title: data.title,
        description: data.description,
        type: data.type,
        location: data.location,
        price_per_night_or_day: data.price_per_night_or_day,
        host_id: session.user.id,
        is_active: data.is_active,
        images_urls: imageUrls, // URLs de las imágenes subidas
      };

      const { data: newListing, error: listingError } = await supabase
        .from('listings')
        .insert([listingData])
        .select()
        .single();

      if (listingError) throw listingError;

      // 2. Crear detalles específicos según el tipo
      if (data.type === 'accommodation' && (data.max_guests || data.bedrooms || data.bathrooms)) {
        const accommodationDetails = {
          listing_id: newListing.id,
          ...(data.max_guests && { max_guests: data.max_guests }),
          ...(data.bedrooms && { bedrooms: data.bedrooms }),
          ...(data.bathrooms && { bathrooms: data.bathrooms }),
          ...(data.amenities && { amenities: data.amenities }),
        };

        const { error: detailsError } = await supabase
          .from('listing_details_accommodation')
          .insert([accommodationDetails]);

        if (detailsError) {
          console.warn('Error al crear detalles de alojamiento:', detailsError);
          // No falla la creación del listing principal
        }
      }

      if (data.type === 'vehicle' && (data.vehicle_type || data.seats)) {
        const vehicleDetails = {
          listing_id: newListing.id,
          ...(data.vehicle_type && { vehicle_type: data.vehicle_type }),
          ...(data.seats && { seats: data.seats }),
          ...(data.amenities && { features: data.amenities }),
        };

        const { error: detailsError } = await supabase
          .from('listing_details_vehicle')
          .insert([vehicleDetails]);

        if (detailsError) {
          console.warn('Error al crear detalles de vehículo:', detailsError);
          // No falla la creación del listing principal
        }
      }

      toast.success('Anuncio creado exitosamente');
      navigate('/dashboard/host');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al crear el anuncio: ' + errorMessage);
      console.error('Database error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>;
  }

  if (!session) {
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
            Crear Nuevo Anuncio
          </h1>
          <p className="text-muted-foreground">
            Comparte tu espacio o vehículo con viajeros en La Gomera
          </p>
        </div>

        {/* Indicador de límites */}
        <div className="mb-6">
          <LimitIndicator
            currentCount={limits.currentCount}
            maxAllowed={limits.maxAllowed}
            planName={limits.planName}
            isUnlimited={limits.isUnlimited}
            loading={limits.loading}
          />
        </div>

        {/* Mensaje de bloqueo si excede límites */}
        {!limits.loading && !limits.canCreate && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-800 mb-1">
                    No puedes crear más anuncios
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    {limits.message || 'Has alcanzado el límite de tu plan actual.'}
                  </p>
                  <Button asChild size="sm" className="bg-red-600 hover:bg-red-700">
                    <a href="/membership">Mejorar Plan</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Tipo de Anuncio */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Anuncio</CardTitle>
                <CardDescription>
                  ¿Qué quieres compartir con los viajeros?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-4">
                          <div 
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                              field.value === 'accommodation' 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => field.onChange('accommodation')}
                          >
                            <Home className="h-8 w-8 text-primary mb-2" />
                            <h3 className="font-semibold">Alojamiento</h3>
                            <p className="text-sm text-muted-foreground">Casa, apartamento, habitación</p>
                          </div>
                          
                          <div 
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                              field.value === 'vehicle' 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => field.onChange('vehicle')}
                          >
                            <Car className="h-8 w-8 text-primary mb-2" />
                            <h3 className="font-semibold">Vehículo</h3>
                            <p className="text-sm text-muted-foreground">Coche, moto, bicicleta</p>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Información Básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>
                  Cuéntanos sobre tu {watchType === 'accommodation' ? 'alojamiento' : 'vehículo'}
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
                        <Input 
                          placeholder={watchType === 'accommodation' 
                            ? "Ej: Casa acogedora con vistas al Teide" 
                            : "Ej: Coche compacto ideal para la isla"
                          } 
                          {...field} 
                        />
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
                          placeholder="Describe tu espacio o vehículo, sus características especiales y qué lo hace único..."
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
                          <Input placeholder="Ej: Valle Gran Rey, San Sebastián..." {...field} />
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
                            placeholder="50" 
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
                          Publicar Inmediatamente
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

            {/* Imágenes del Anuncio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Imágenes del Anuncio
                </CardTitle>
                <CardDescription>
                  Sube hasta 10 imágenes de alta calidad. La primera imagen será la principal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  onImagesChange={setImageUrls}
                  initialImages={imageUrls}
                  maxImages={10}
                  maxSizeMB={5}
                  disabled={submitting}
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
                {submitting ? 'Creando...' : 'Crear Anuncio'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      
      <Footer />
    </div>
  );
};

export default CreateListing;