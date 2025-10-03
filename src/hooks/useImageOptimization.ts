import { useState, useEffect, useRef } from 'react';

interface UseImageOptimizationOptions {
  priority?: boolean;
  sizes?: string;
  quality?: number;
  fallback?: string;
}

interface UseImageOptimizationReturn {
  isLoaded: boolean;
  isError: boolean;
  isInView: boolean;
  imgRef: React.RefObject<HTMLImageElement>;
  handleLoad: () => void;
  handleError: () => void;
}

export const useImageOptimization = (
  src: string,
  options: UseImageOptimizationOptions = {}
): UseImageOptimizationReturn => {
  const { priority = false, fallback } = options;
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

  // Reset states cuando cambia la imagen
  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsError(false);
  };

  const handleError = () => {
    setIsError(true);
    setIsLoaded(false);
    
    // Si hay fallback, intentar cargarlo
    if (fallback && src !== fallback) {
      // Esto se manejaría en el componente padre
      console.warn(`Failed to load image: ${src}, fallback available`);
    }
  };

  return {
    isLoaded,
    isError,
    isInView,
    imgRef,
    handleLoad,
    handleError
  };
};

// Hook para precargar imágenes críticas
export const useImagePreloader = (urls: string[]) => {
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const preloadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          setPreloadedImages(prev => new Set([...prev, url]));
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });
    };

    // Precargar imágenes en paralelo
    Promise.allSettled(urls.map(preloadImage))
      .then(results => {
        const failed = results
          .filter((result, index) => result.status === 'rejected')
          .map((_, index) => urls[index]);
        
        if (failed.length > 0) {
          console.warn('Failed to preload images:', failed);
        }
      });
  }, [urls]);

  return {
    isPreloaded: (url: string) => preloadedImages.has(url),
    preloadedCount: preloadedImages.size,
    totalCount: urls.length
  };
};

// Utilidad para generar URLs optimizadas de Supabase
export const getOptimizedImageUrl = (
  url: string, 
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  } = {}
): string => {
  try {
    const urlObj = new URL(url);
    
    // Si es una URL de Supabase Storage, agregar parámetros de transformación
    if (urlObj.hostname.includes('supabase')) {
      const params = new URLSearchParams();
      
      if (options.width) params.set('width', options.width.toString());
      if (options.height) params.set('height', options.height.toString());
      if (options.quality) params.set('quality', options.quality.toString());
      if (options.format) params.set('format', options.format);
      
      if (params.toString()) {
        urlObj.search = params.toString();
      }
    }
    
    return urlObj.toString();
  } catch {
    return url; // Return original URL if invalid
  }
};

// Hook para responsive images
export const useResponsiveImage = (
  baseUrl: string,
  breakpoints: { [key: string]: { width: number; quality?: number } } = {
    mobile: { width: 400, quality: 80 },
    tablet: { width: 768, quality: 85 },
    desktop: { width: 1200, quality: 90 }
  }
) => {
  const [currentSrc, setCurrentSrc] = useState(baseUrl);

  useEffect(() => {
    const updateImageSrc = () => {
      const width = window.innerWidth;
      
      let selectedBreakpoint = breakpoints.mobile;
      
      if (width >= 1200) {
        selectedBreakpoint = breakpoints.desktop;
      } else if (width >= 768) {
        selectedBreakpoint = breakpoints.tablet;
      }
      
      const optimizedUrl = getOptimizedImageUrl(baseUrl, selectedBreakpoint);
      setCurrentSrc(optimizedUrl);
    };

    updateImageSrc();
    window.addEventListener('resize', updateImageSrc);
    
    return () => window.removeEventListener('resize', updateImageSrc);
  }, [baseUrl, breakpoints]);

  return currentSrc;
};

export default useImageOptimization;