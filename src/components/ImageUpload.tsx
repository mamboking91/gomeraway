import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabaseClient';
import { Upload, X, ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImagesChange: (urls: string[]) => void;
  initialImages?: string[];
  maxImages?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

interface UploadingImage {
  id: string;
  file: File;
  progress: number;
  url?: string;
  error?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImagesChange,
  initialImages = [],
  maxImages = 10,
  maxSizeMB = 5,
  disabled = false
}) => {
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Actualizar padre cuando cambien las imágenes
  const updateImages = useCallback((newImages: string[]) => {
    setImages(newImages);
    onImagesChange(newImages);
  }, [onImagesChange]);

  // Validar archivo
  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Solo se permiten archivos de imagen';
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `El archivo debe ser menor a ${maxSizeMB}MB`;
    }
    return null;
  };

  // Subir imagen a Supabase Storage
  const uploadImage = async (file: File, uploadId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // Subir archivo
      const { data, error } = await supabase.storage
        .from('listings-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('listings-images')
        .getPublicUrl(data.path);

      // Actualizar estado de subida
      setUploadingImages(prev => 
        prev.map(img => 
          img.id === uploadId 
            ? { ...img, progress: 100, url: publicUrl }
            : img
        )
      );

      // Agregar a la lista de imágenes
      const newImages = [...images, publicUrl];
      updateImages(newImages);

      // Remover de lista de subida después de un momento
      setTimeout(() => {
        setUploadingImages(prev => prev.filter(img => img.id !== uploadId));
      }, 1000);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadingImages(prev => 
        prev.map(img => 
          img.id === uploadId 
            ? { ...img, error: 'Error al subir imagen' }
            : img
        )
      );
      toast.error('Error al subir imagen');
      throw error;
    }
  };

  // Procesar archivos seleccionados
  const handleFiles = async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length - uploadingImages.length;
    
    if (fileArray.length > remainingSlots) {
      toast.error(`Solo puedes subir ${remainingSlots} imagen(es) más`);
      return;
    }

    // Validar archivos
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Crear entradas de subida
    const newUploading = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0
    }));

    setUploadingImages(prev => [...prev, ...newUploading]);

    // Subir archivos
    for (const uploadingImage of newUploading) {
      try {
        // Simular progreso
        const progressInterval = setInterval(() => {
          setUploadingImages(prev => 
            prev.map(img => 
              img.id === uploadingImage.id && img.progress < 90
                ? { ...img, progress: img.progress + 10 }
                : img
            )
          );
        }, 200);

        await uploadImage(uploadingImage.file, uploadingImage.id);
        clearInterval(progressInterval);
      } catch (error) {
        // Error ya manejado en uploadImage
      }
    }
  };

  // Eliminar imagen
  const removeImage = async (url: string, index: number) => {
    if (disabled) return;

    try {
      // Extraer path del URL para eliminar de storage
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `public/${fileName}`;

      // Eliminar de Supabase Storage
      const { error } = await supabase.storage
        .from('listings-images')
        .remove([filePath]);

      if (error) {
        console.warn('Error deleting from storage:', error);
        // Continuar aunque falle el borrado del storage
      }

      // Eliminar de la lista
      const newImages = images.filter((_, i) => i !== index);
      updateImages(newImages);
      toast.success('Imagen eliminada');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Error al eliminar imagen');
    }
  };

  // Eventos de drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const canAddMore = images.length + uploadingImages.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Área de subida */}
      {canAddMore && !disabled && (
        <Card 
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) handleFiles(files);
            };
            input.click();
          }}
        >
          <CardContent className="p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-1">
              Arrastra imágenes aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500">
              Máximo {maxImages} imágenes, {maxSizeMB}MB cada una
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Quedan {maxImages - images.length - uploadingImages.length} disponibles
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de imágenes subiendo */}
      {uploadingImages.length > 0 && (
        <div className="space-y-2">
          {uploadingImages.map((upload) => (
            <Card key={upload.id} className="p-3">
              <div className="flex items-center space-x-3">
                <ImageIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{upload.file.name}</p>
                  {upload.error ? (
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <p className="text-xs text-red-600">{upload.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Progress value={upload.progress} className="h-2" />
                      <p className="text-xs text-gray-500">{upload.progress}%</p>
                    </div>
                  )}
                </div>
                {upload.error && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadingImages(prev => prev.filter(img => img.id !== upload.id));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Grid de imágenes subidas */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((url, index) => (
            <Card key={url} className="relative group overflow-hidden">
              <div className="aspect-square">
                <img 
                  src={url} 
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0.5';
                    e.currentTarget.title = 'Error al cargar imagen';
                  }}
                  style={{ opacity: '0' }}
                />
                {!disabled && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(url, index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Principal
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {images.length === 0 && uploadingImages.length === 0 && (
        <Card className="p-6 text-center text-gray-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay imágenes aún</p>
        </Card>
      )}
    </div>
  );
};

export default ImageUpload;