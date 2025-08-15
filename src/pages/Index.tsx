import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/header';
import HeroSearch from '@/components/ui/hero-search';
import ListingCard from '@/components/listing-card';
import Footer from '@/components/footer';
import heroImage from '@/assets/hero-lagomera.jpg';
import { supabase } from '../lib/supabaseClient'; // Importamos nuestro cliente de Supabase

// Función para obtener los anuncios de Supabase
const fetchListings = async () => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true); // Solo traemos los anuncios activos

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const Index = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('all');

  // Usamos useQuery para obtener los datos
  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings'],
    queryFn: fetchListings,
  });

  // Filtrado de anuncios (ahora dinámico)
  const filteredListings =
    !isLoading && listings
      ? activeTab === 'all'
        ? listings
        : listings.filter((listing) => listing.type === activeTab)
      : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section 
        className="relative min-h-[70vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-hero"></div>
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
            {t('hero.title')}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 animate-fade-in">
            {t('hero.subtitle')}
          </p>
          <div className="animate-scale-in">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Explore Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('main.exploreTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('main.exploreSubtitle')}
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8 bg-muted rounded-xl p-1">
            <TabsTrigger value="all" className="rounded-lg font-medium">
              {t('category.all')}
            </TabsTrigger>
            <TabsTrigger value="accommodation" className="rounded-lg font-medium">
              🏠 {t('category.stays')}
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="rounded-lg font-medium">
              🚗 {t('category.vehicles')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading && <p>Cargando anuncios...</p>}
            {isError && <p>Error al cargar los anuncios.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredListings.map((listing) => (
                <div key={listing.id} className="animate-fade-in">
                  {/* Asegúrate de que ListingCard acepte estas props */}
                  <ListingCard 
                    id={listing.id}
                    title={listing.title}
                    location={listing.location}
                    price={listing.price_per_night_or_day}
                    currency="€"
                    rating={4.5} // Dato de ejemplo, lo conectaremos más tarde
                    reviewCount={0} // Dato de ejemplo
                    images={listing.images_urls || []}
                    type={listing.type}
                    // Los detalles y el host los conectaremos en los siguientes pasos
                    host={{ name: 'Anfitrión', verified: true }} 
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-12">
          <Button 
            variant="outline" 
            className="px-8 py-3 text-lg font-medium rounded-xl border-2 hover:bg-primary hover:text-primary-foreground transition-all"
          >
            {t('main.showMore')}
          </Button>
        </div>
      </section>
      
      {/* ... (resto del componente "Why Choose" y "Footer" que ya tienes) ... */}
      <section className="py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('main.whyChoose')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-2xl shadow-soft">
              <div className="text-4xl mb-4">🏝️</div>
              <h3 className="text-xl font-semibold mb-2">{t('features.localTitle')}</h3>
              <p className="text-muted-foreground">{t('features.localDesc')}</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl shadow-soft">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">{t('features.trustedTitle')}</h3>
              <p className="text-muted-foreground">{t('features.trustedDesc')}</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl shadow-soft">
              <div className="text-4xl mb-4">💚</div>
              <h3 className="text-xl font-semibold mb-2">{t('features.sustainableTitle')}</h3>
              <p className="text-muted-foreground">{t('features.sustainableDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;