import { supabase } from '@/lib/supabaseClient';

export interface ImageUrlResult {
  url: string;
  isPlaceholder: boolean;
  error?: string;
}

/**
 * Construye URLs de imágenes de Supabase Storage con fallbacks
 */
export const getSupabaseImageUrl = (imagePath: string | null | undefined): ImageUrlResult => {
  // Si no hay path, usar placeholder
  if (!imagePath || imagePath.trim() === '') {
    return {
      url: '/placeholder.svg',
      isPlaceholder: true
    };
  }

  try {
    // Limpiar el path de espacios y caracteres extraños
    let cleanPath = imagePath.trim();
    
    // Si ya es una URL completa, devolverla tal como está
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      return {
        url: cleanPath,
        isPlaceholder: false
      };
    }
    
    // Si el path ya incluye la estructura completa del storage de Supabase, usarlo directamente
    if (cleanPath.includes('/storage/v1/object/public/')) {
      return {
        url: cleanPath,
        isPlaceholder: false
      };
    }
    
    // Para paths que empiecen con 'public/', usarlos directamente
    // Para otros paths, agregar 'public/' solo si no está ya incluido
    if (!cleanPath.startsWith('public/') && !cleanPath.includes('/')) {
      cleanPath = `public/${cleanPath}`;
    }
    
    // Obtener URL pública de Supabase Storage
    const { data: { publicUrl } } = supabase.storage
      .from('listings-images')
      .getPublicUrl(cleanPath);
    
    // Verificar que la URL sea válida
    if (!publicUrl || publicUrl.includes('undefined') || publicUrl.includes('null')) {
      return {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="200" y="150" text-anchor="middle" fill="%236b7280" font-family="Arial,sans-serif" font-size="16">Imagen no disponible</text></svg>',
        isPlaceholder: true,
        error: 'Invalid URL generated'
      };
    }
    
    return {
      url: publicUrl,
      isPlaceholder: false
    };
    
  } catch (error) {
    return {
      url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="200" y="150" text-anchor="middle" fill="%236b7280" font-family="Arial,sans-serif" font-size="16">Imagen no disponible</text></svg>',
      isPlaceholder: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Convierte un array de paths de imágenes a URLs completas
 */
export const getSupabaseImageUrls = (imagePaths: string[] | null | undefined): string[] => {
  if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
    return ['data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="200" y="150" text-anchor="middle" fill="%236b7280" font-family="Arial,sans-serif" font-size="16">Imagen no disponible</text></svg>'];
  }

  const urls = imagePaths
    .filter(path => path && path.trim() !== '') // Filtrar paths vacíos
    .map(path => getSupabaseImageUrl(path))
    .map(result => result.url);

  // Si no hay URLs válidas, devolver placeholder
  if (urls.length === 0) {
    return ['data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="200" y="150" text-anchor="middle" fill="%236b7280" font-family="Arial,sans-serif" font-size="16">Imagen no disponible</text></svg>'];
  }

  return urls;
};

/**
 * Verifica si una imagen existe en el storage
 */
export const checkImageExists = async (imagePath: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage
      .from('listings-images')
      .download(imagePath);
    
    return !error && data !== null;
  } catch {
    return false;
  }
};

/**
 * Lista archivos en el bucket para debugging
 */
export const listStorageFiles = async (folder = 'public') => {
  try {
    const { data, error } = await supabase.storage
      .from('listings-images')
      .list(folder);
    
    if (error) {
      return [];
    }
    
    return data || [];
  } catch (error) {
    return [];
  }
};