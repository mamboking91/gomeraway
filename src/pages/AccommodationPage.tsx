import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ListingCard from '@/components/listing-card';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';

const fetchAccommodations = async () => {
  // Primero obtenemos los listings
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .eq('type', 'accommodation')
    .eq('is_active', true);

  if (listingsError) {
    throw new Error(listingsError.message);
  }

  if (!listings || listings.length === 0) {
    return [];
  }

  // Luego obtenemos los profiles
  const hostIds = [...new Set(listings.map(listing => listing.host_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', hostIds);

  // Combinamos los datos
  const listingsWithProfiles = listings.map(listing => {
    const profile = profiles?.find(p => p.id === listing.host_id);
    return {
      ...listing,
      profiles: profile || null
    };
  });

  return listingsWithProfiles;
};

const AccommodationPage = () => {
  const { t } = useLanguage();
  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['accommodations'],
    queryFn: fetchAccommodations,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t('category.accommodation')} en La Gomera
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('pages.accommodationSubtitle')}
          </p>
        </div>

        {isLoading && <p>{t('pages.loading')}</p>}
        {isError && <p>{t('pages.error')}</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings?.map((listing) => (
            <div key={listing.id} className="animate-fade-in">
              <ListingCard 
                id={listing.id}
                title={listing.title}
                location={listing.location}
                price={listing.price_per_night_or_day}
                currency="€"
                rating={4.5}
                reviewCount={0}
                images={listing.images_urls || []}
                type={listing.type}
                host={{ 
                  name: listing.profiles?.full_name || listing.profiles?.email?.split('@')[0] || 'Anfitrión', 
                  verified: true 
                }} 
              />
            </div>
          ))}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AccommodationPage;