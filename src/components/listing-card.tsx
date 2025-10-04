// src/components/listing-card.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // <--- AÑADIDO
import { Star, Heart, MapPin, Users, Car, Fuel, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { OptimizedImage } from '@/components/OptimizedImage';
import { getSupabaseImageUrl } from '@/utils/imageUtils';

interface ListingCardProps {
  id: string | number;
  title: string;
  location: string;
  price: number | string;
  currency: string;
  rating: number;
  reviewCount: number;
  images: string[];
  type: 'accommodation' | 'vehicle';
  features?: string[];
  vehicleDetails?: {
    fuel: string;
    transmission: string;
    seats: number;
  };
  accommodationDetails?: {
    guests: number;
    bedrooms: number;
    bathrooms: number;
  };
  host: {
    name: string;
    verified: boolean;
  };
}

const ListingCard: React.FC<ListingCardProps> = ({
  id, // <-- ID es necesario para el enlace
  title,
  location,
  price,
  currency,
  rating,
  reviewCount,
  images,
  type,
  features = [],
  vehicleDetails,
  accommodationDetails,
  host,
}) => {
  const { t } = useLanguage();

  // Get image URL using improved helper
  const imageResult = getSupabaseImageUrl(images && images.length > 0 ? images[0] : null);
  const imageUrl = imageResult.url;

  return (
    <Link to={`/listing/${id}`}>
      <div className="group bg-gradient-card rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        {/* Image Gallery */}
        <div className="relative aspect-square overflow-hidden">
          <OptimizedImage
            src={imageUrl}
            alt={title}
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
            aspectRatio="square"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full shadow-soft"
          >
            <Heart className="h-4 w-4" />
          </Button>
          {features.length > 0 && (
            <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
              {features[0]}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {title}
              </h3>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                {location}
              </div>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="text-sm font-medium">{rating}</span>
              <span className="text-sm text-muted-foreground ml-1">({reviewCount})</span>
            </div>
          </div>

          {/* Details */}
          <div className="mb-3">
            {type === 'accommodation' && accommodationDetails && (
              <div className="flex items-center text-sm text-muted-foreground space-x-3">
                <div className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {accommodationDetails.guests} {t('listing.guests')}
                </div>
                <div>{accommodationDetails.bedrooms} {t('listing.bedrooms')}</div>
                <div>{accommodationDetails.bathrooms} {t('listing.bathrooms')}</div>
              </div>
            )}
            {type === 'vehicle' && vehicleDetails && (
              <div className="flex items-center text-sm text-muted-foreground space-x-3">
                <div className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {vehicleDetails.seats} {t('listing.seats')}
                </div>
                <div className="flex items-center">
                  <Fuel className="h-3 w-3 mr-1" />
                  {vehicleDetails.fuel}
                </div>
                <div className="flex items-center">
                  <Settings className="h-3 w-3 mr-1" />
                  {vehicleDetails.transmission}
                </div>
              </div>
            )}
          </div>

          {/* Host */}
          <div className="flex items-center mb-3">
            <div className="text-sm text-muted-foreground">
              {t('listing.hostedBy')} <span className="font-medium text-foreground">{host.name}</span>
              {host.verified && <span className="text-accent ml-1">✓</span>}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-foreground">
                {currency}{price}
              </span>
              <span className="text-sm text-muted-foreground">
                {type === 'accommodation' ? t('listing.night') : t('listing.day')}
              </span>
            </div>
            <Button className="bg-gradient-primary hover:opacity-90 px-6 rounded-xl shadow-soft">
              {type === 'accommodation' ? t('listing.book') : t('listing.rent')}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;