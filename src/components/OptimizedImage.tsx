import React, { useState, useRef, useEffect } from 'react';
import { ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  priority?: boolean; // Para imágenes above-the-fold
  aspectRatio?: 'square' | 'video' | 'auto';
  sizes?: string; // Para responsive images
  onClick?: () => void;
}

interface ImageGalleryProps {
  images: string[];
  title: string;
  className?: string;
  maxHeight?: string;
  showThumbnails?: boolean;
}

// Componente para una sola imagen optimizada
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallback,
  priority = false,
  aspectRatio = 'auto',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (priority) return; // Skip lazy loading para imágenes prioritarias

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '50px', // Empezar a cargar 50px antes de que sea visible
        threshold: 0.1 
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: ''
  };

  const handleLoad = () => {
    setIsLoaded(true);
    setIsError(false);
  };

  const handleError = () => {
    setIsError(true);
    setIsLoaded(false);
  };

  if (isError && fallback) {
    return (
      <OptimizedImage
        src={fallback}
        alt={alt}
        className={className}
        priority={priority}
        aspectRatio={aspectRatio}
        onClick={onClick}
      />
    );
  }

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${aspectClasses[aspectRatio]} ${className}`}
      onClick={onClick}
    >
      {/* Skeleton loader */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <ImageIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Error al cargar imagen</p>
          </div>
        </div>
      )}

      {/* Imagen principal */}
      {(isInView || priority) && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Click overlay */}
      {onClick && (
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all cursor-pointer" />
      )}
    </div>
  );
};

// Componente para galería de imágenes
export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title,
  className = '',
  maxHeight = '500px',
  showThumbnails = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  if (!images || images.length === 0) {
    return (
      <Card className={`${className} p-8 text-center`}>
        <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">No hay imágenes disponibles</p>
      </Card>
    );
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={className}>
      {/* Imagen principal */}
      <div className="relative rounded-lg overflow-hidden mb-4" style={{ maxHeight }}>
        <OptimizedImage
          src={images[currentIndex]}
          alt={`${title} - Imagen ${currentIndex + 1}`}
          className="w-full h-full"
          priority={currentIndex === 0}
          onClick={() => setShowLightbox(true)}
        />

        {/* Controles de navegación */}
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Indicador de posición */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="grid grid-cols-6 gap-2">
          {images.slice(0, 6).map((image, index) => (
            <div
              key={index}
              className={`cursor-pointer rounded overflow-hidden border-2 transition-all ${
                index === currentIndex ? 'border-primary' : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <OptimizedImage
                src={image}
                alt={`${title} - Thumbnail ${index + 1}`}
                className="w-full"
                aspectRatio="square"
              />
            </div>
          ))}
          {images.length > 6 && (
            <div 
              className="aspect-square bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => setShowLightbox(true)}
            >
              <span className="text-sm font-medium text-gray-600">+{images.length - 6}</span>
            </div>
          )}
        </div>
      )}

      {/* Lightbox modal */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
              onClick={() => setShowLightbox(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            <OptimizedImage
              src={images[currentIndex]}
              alt={`${title} - Imagen ${currentIndex + 1}`}
              className="max-w-full max-h-full"
              priority={true}
            />

            {images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;