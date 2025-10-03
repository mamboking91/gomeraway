-- =====================================================
-- CONFIGURACIÓN DEL BUCKET DE SUPABASE STORAGE
-- Para imágenes de listings de GomeraWay
-- =====================================================

-- 1. Crear bucket para imágenes de listings (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'listings-images',
    'listings-images', 
    true, 
    5242880, -- 5MB en bytes
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas RLS para el bucket listings-images

-- Política para permitir subida de imágenes (solo hosts autenticados)
CREATE POLICY "Allow authenticated hosts to upload images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'listings-images' 
    AND auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
);

-- Política para permitir lectura pública de imágenes
CREATE POLICY "Allow public read access to listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings-images');

-- Política para permitir actualización de imágenes (solo el propietario)
CREATE POLICY "Allow hosts to update their images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'listings-images' 
    AND auth.uid() IS NOT NULL
);

-- Política para permitir eliminación de imágenes (solo el propietario)
CREATE POLICY "Allow hosts to delete their images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'listings-images' 
    AND auth.uid() IS NOT NULL
);

-- =====================================================
-- VERIFICACIÓN DE LA CONFIGURACIÓN
-- =====================================================

-- Verificar que el bucket existe
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'listings-images';

-- Verificar políticas RLS del bucket
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname ILIKE '%listing%';

-- =====================================================
-- COMANDOS DE LIMPIEZA (USAR CON PRECAUCIÓN)
-- =====================================================

-- Para eliminar todas las políticas de listings-images:
-- DROP POLICY IF EXISTS "Allow authenticated hosts to upload images" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public read access to listing images" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow hosts to update their images" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow hosts to delete their images" ON storage.objects;

-- Para eliminar el bucket (esto eliminará todas las imágenes):
-- DELETE FROM storage.objects WHERE bucket_id = 'listings-images';
-- DELETE FROM storage.buckets WHERE id = 'listings-images';