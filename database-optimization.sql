-- =====================================================
-- OPTIMIZACIÓN DE BASE DE DATOS PARA GOMERAWAY
-- Performance indexes, query optimization, pagination
-- =====================================================

-- 1. ANÁLISIS DE QUERIES FRECUENTES
-- =====================================================

-- Queries más comunes identificadas en el código:

-- A) Búsqueda de listings por tipo y estado activo (Index.tsx, AccommodationPage.tsx)
-- SELECT * FROM listings WHERE type = 'accommodation' AND is_active = true;
-- SELECT * FROM listings WHERE type = 'vehicle' AND is_active = true;

-- B) Lookup de listings por host_id (HostDashboard.tsx)
-- SELECT * FROM listings WHERE host_id = '...';

-- C) Búsqueda de detalles de listing por ID (ListingDetailPage.tsx)
-- SELECT * FROM listings WHERE id = '...';

-- D) Queries de admin panel (AdminDashboard, ListingsManager, etc.)
-- SELECT * FROM listings ORDER BY created_at DESC;
-- SELECT * FROM subscriptions WHERE status = 'active';
-- SELECT * FROM bookings WHERE status = 'confirmed';

-- E) Queries de analytics (AnalyticsDashboard.tsx)
-- SELECT COUNT(*) FROM listings;
-- SELECT COUNT(*) FROM subscriptions WHERE status = 'active';
-- SELECT COUNT(*) FROM bookings WHERE status = 'confirmed';

-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para tabla listings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_type_active 
ON listings (type, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_host_id 
ON listings (host_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_created_at 
ON listings (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_type_created 
ON listings (type, created_at DESC);

-- Índices para tabla subscriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id 
ON subscriptions (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status 
ON subscriptions (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_created_at 
ON subscriptions (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status_created 
ON subscriptions (status, created_at DESC);

-- Índices para tabla bookings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_listing_id 
ON bookings (listing_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id 
ON bookings (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status 
ON bookings (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at 
ON bookings (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created 
ON bookings (status, created_at DESC);

-- Índices para tabla profiles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role 
ON profiles (role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at 
ON profiles (created_at DESC);

-- Índices para detalles de listings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_details_accommodation_listing_id 
ON listing_details_accommodation (listing_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_details_vehicle_listing_id 
ON listing_details_vehicle (listing_id);

-- 3. OPTIMIZACIÓN DE QUERIES ESPECÍFICAS
-- =====================================================

-- Query optimizada para página principal (Index.tsx)
-- Combina type filter con limit para mejor performance
-- En lugar de: SELECT * FROM listings WHERE type = 'accommodation' AND is_active = true;
-- Usar: SELECT * FROM listings WHERE type = 'accommodation' AND is_active = true ORDER BY created_at DESC LIMIT 20;

-- Query optimizada para admin analytics
-- En lugar de múltiples COUNT(*) separados, usar una sola query:
WITH analytics_summary AS (
  SELECT 
    (SELECT COUNT(*) FROM listings) as total_listings,
    (SELECT COUNT(*) FROM listings WHERE is_active = true) as active_listings,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
    (SELECT COUNT(*) FROM profiles) as total_profiles
);

-- 4. QUERIES PREPARADAS PARA PAGINACIÓN
-- =====================================================

-- Template para paginación en listings
-- LIMIT y OFFSET con ORDER BY para resultados consistentes
CREATE OR REPLACE FUNCTION get_listings_paginated(
  p_type text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  type text,
  location text,
  price_per_night_or_day numeric,
  host_id uuid,
  is_active boolean,
  images_urls text[],
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, l.title, l.description, l.type, l.location, 
    l.price_per_night_or_day, l.host_id, l.is_active, 
    l.images_urls, l.created_at, l.updated_at
  FROM listings l
  WHERE 
    (p_type IS NULL OR l.type = p_type)
    AND l.is_active = p_is_active
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Template para paginación en admin bookings
CREATE OR REPLACE FUNCTION get_bookings_paginated(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  listing_id uuid,
  user_id uuid,
  status booking_status,
  check_in_date date,
  check_out_date date,
  total_price numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id, b.listing_id, b.user_id, b.status,
    b.check_in_date, b.check_out_date, b.total_price, b.created_at
  FROM bookings b
  WHERE 
    (p_status IS NULL OR b.status::text = p_status)
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCIONES DE ANALYTICS OPTIMIZADAS
-- =====================================================

-- Función para obtener métricas del dashboard de una sola vez
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_hosts', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
    'active_listings', (SELECT COUNT(*) FROM listings WHERE is_active = true),
    'total_bookings', (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'),
    'total_revenue', (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 'confirmed'),
    'monthly_revenue', (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM bookings 
      WHERE status = 'confirmed' 
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'latest_listings', (
      SELECT json_agg(json_build_object(
        'id', id,
        'title', title,
        'type', type,
        'created_at', created_at
      ))
      FROM (
        SELECT id, title, type, created_at
        FROM listings 
        WHERE is_active = true
        ORDER BY created_at DESC 
        LIMIT 5
      ) recent_listings
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. MONITOREO DE PERFORMANCE
-- =====================================================

-- View para monitorear queries lentas
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements 
WHERE calls > 100 AND mean_time > 100
ORDER BY mean_time DESC;

-- View para monitorear uso de índices
CREATE OR REPLACE VIEW index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 7. MANTENIMIENTO AUTOMÁTICO
-- =====================================================

-- Función para limpiar datos antiguos (ejecutar semanalmente)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Limpiar logs antiguos si existen
  -- DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Actualizar estadísticas de tablas importantes
  ANALYZE listings;
  ANALYZE subscriptions;
  ANALYZE bookings;
  ANALYZE profiles;
  
  -- Reindexar si es necesario (cuidado en producción)
  -- REINDEX INDEX CONCURRENTLY idx_listings_type_active;
END;
$$ LANGUAGE plpgsql;

-- 8. CONFIGURACIONES RECOMENDADAS
-- =====================================================

-- Para mejorar performance de queries de analytics:
-- SET work_mem = '256MB';  -- Solo para queries pesadas
-- SET random_page_cost = 1.1;  -- Para SSDs
-- SET effective_cache_size = '4GB';  -- Ajustar según RAM disponible

-- 9. VERIFICACIÓN DE OPTIMIZACIONES
-- =====================================================

-- Query para verificar que los índices están siendo utilizados
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as "Index Scans",
  idx_tup_read as "Tuples Read",
  idx_tup_fetch as "Tuples Fetched"
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Query para ver el tamaño de las tablas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Size"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN:
-- 
-- 1. Ejecutar este script en horario de menor uso
-- 2. Los índices CONCURRENTLY no bloquean la tabla
-- 3. Monitorear performance después de aplicar cambios
-- 4. Ajustar parámetros según el hardware disponible
-- 5. Programar cleanup_old_data() como cron job semanal
-- =====================================================