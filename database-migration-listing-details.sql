-- ====================================================
-- MIGRACIÓN DE ESTRUCTURA DE DETALLES DE LISTINGS
-- ====================================================
-- Fecha: 2025-10-04
-- Propósito: Añadir columnas faltantes y corregir inconsistencias

-- 1. MIGRACIÓN PARA VEHICLES
-- ====================================================

-- Añadir columna vehicle_type a listing_details_vehicle
ALTER TABLE listing_details_vehicle 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

-- Añadir columna features a listing_details_vehicle  
ALTER TABLE listing_details_vehicle 
ADD COLUMN IF NOT EXISTS features TEXT[];

-- Comentarios para documentar las columnas
COMMENT ON COLUMN listing_details_vehicle.vehicle_type IS 'Tipo de vehículo: car, suv, van, motorcycle, bike, etc.';
COMMENT ON COLUMN listing_details_vehicle.features IS 'Array de características y extras del vehículo';
COMMENT ON COLUMN listing_details_vehicle.fuel IS 'Tipo de combustible: gasolina, diesel, eléctrico, híbrido, etc.';
COMMENT ON COLUMN listing_details_vehicle.transmission IS 'Tipo de transmisión: manual, automática';
COMMENT ON COLUMN listing_details_vehicle.seats IS 'Número de asientos disponibles';

-- 2. VERIFICACIÓN DE ACCOMMODATION (ya debería estar bien)
-- ====================================================

-- Verificar que listing_details_accommodation tenga la estructura correcta
-- Si es necesario, corregir el nombre de la columna guests a max_guests
DO $$
BEGIN
    -- Verificar si existe la columna 'guests' y no existe 'max_guests'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listing_details_accommodation' 
        AND column_name = 'guests'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listing_details_accommodation' 
        AND column_name = 'max_guests'
    ) THEN
        -- Renombrar guests a max_guests para consistencia
        ALTER TABLE listing_details_accommodation 
        RENAME COLUMN guests TO max_guests;
        
        RAISE NOTICE 'Columna guests renombrada a max_guests en listing_details_accommodation';
    END IF;
    
    -- Verificar si features está como TEXT[] o necesita conversión
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listing_details_accommodation' 
        AND column_name = 'features'
        AND data_type = 'text'
    ) THEN
        -- Si features es TEXT simple, cambiar a TEXT[]
        ALTER TABLE listing_details_accommodation 
        ALTER COLUMN features TYPE TEXT[] USING string_to_array(features, ',');
        
        RAISE NOTICE 'Columna features convertida a TEXT[] en listing_details_accommodation';
    END IF;

    -- Si no existe la columna features, agregarla
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listing_details_accommodation' 
        AND column_name = 'features'
    ) THEN
        ALTER TABLE listing_details_accommodation 
        ADD COLUMN features TEXT[];
        
        RAISE NOTICE 'Columna features agregada a listing_details_accommodation';
    END IF;

    -- Si existe amenities en lugar de features, renombrar
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listing_details_accommodation' 
        AND column_name = 'amenities'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listing_details_accommodation' 
        AND column_name = 'features'
    ) THEN
        ALTER TABLE listing_details_accommodation 
        RENAME COLUMN amenities TO features;
        
        RAISE NOTICE 'Columna amenities renombrada a features en listing_details_accommodation';
    END IF;
END $$;

-- 3. COMENTARIOS PARA DOCUMENTATION
-- ====================================================

COMMENT ON COLUMN listing_details_accommodation.max_guests IS 'Número máximo de huéspedes permitidos';
COMMENT ON COLUMN listing_details_accommodation.bedrooms IS 'Número de dormitorios/habitaciones';
COMMENT ON COLUMN listing_details_accommodation.bathrooms IS 'Número de baños';
COMMENT ON COLUMN listing_details_accommodation.features IS 'Array de amenidades y características del alojamiento';

-- 4. ÍNDICES PARA PERFORMANCE (si no existen)
-- ====================================================

-- Índice para búsquedas por tipo de vehículo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_details_vehicle_type 
ON listing_details_vehicle (vehicle_type);

-- Índice para búsquedas por número de asientos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_details_vehicle_seats 
ON listing_details_vehicle (seats);

-- Índice para búsquedas por número de huéspedes en alojamientos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_details_accommodation_guests 
ON listing_details_accommodation (max_guests);

-- 5. MIGRACIÓN DE DATOS EXISTENTES (si es necesario)
-- ====================================================

-- Si ya hay datos en la columna fuel que representan vehicle_type, copiarlos
UPDATE listing_details_vehicle 
SET vehicle_type = fuel 
WHERE vehicle_type IS NULL 
AND fuel IS NOT NULL 
AND fuel IN ('car', 'suv', 'van', 'motorcycle', 'bike');

-- Limpiar datos de fuel que no son combustibles reales
UPDATE listing_details_vehicle 
SET fuel = NULL 
WHERE fuel IN ('car', 'suv', 'van', 'motorcycle', 'bike');

-- 6. VERIFICACIÓN FINAL
-- ====================================================

-- Mostrar la estructura final de las tablas
DO $$
BEGIN
    RAISE NOTICE '=== ESTRUCTURA FINAL DE TABLAS ===';
    RAISE NOTICE 'listing_details_vehicle: listing_id, fuel, transmission, seats, vehicle_type, features';
    RAISE NOTICE 'listing_details_accommodation: listing_id, max_guests, bedrooms, bathrooms, features';
END $$;

-- Verificar que las columnas existen
SELECT 
    'listing_details_vehicle' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'listing_details_vehicle'
ORDER BY column_name;

SELECT 
    'listing_details_accommodation' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'listing_details_accommodation'
ORDER BY column_name;