# GomeraWay - Database System Reference

## 📊 Resumen del Sistema de Base de Datos

**Database Engine:** PostgreSQL (via Supabase)  
**Schema:** Normalizado con relaciones FK  
**Autenticación:** Supabase Auth integrado  
**Seguridad:** Row Level Security (RLS) habilitado  
**Total Tablas:** 5 tablas principales  
**Total Enums:** 4 tipos personalizados  
**Total Funciones:** 4 funciones personalizadas  

---

## 🗂️ Estructura de Tablas

### **profiles** - Gestión de Usuarios
```sql
CREATE TABLE profiles (
    id                  UUID PRIMARY KEY,              -- FK a auth.users
    full_name           TEXT,                          -- Nombre completo
    avatar_url          TEXT,                          -- URL del avatar
    is_host             BOOLEAN DEFAULT false,         -- ¿Es anfitrión?
    email               TEXT,                          -- Email del usuario
    phone               TEXT,                          -- Teléfono de contacto
    address             TEXT,                          -- Dirección física
    city                TEXT,                          -- Ciudad
    country             TEXT,                          -- País
    date_of_birth       DATE,                          -- Fecha de nacimiento
    profile_completed   BOOLEAN DEFAULT false,         -- ¿Perfil completado?
    updated_at          TIMESTAMP DEFAULT now(),       -- Última actualización
    role                TEXT DEFAULT 'user'            -- Rol: user/admin
);
```

**Índices Optimizados:**
- `idx_profiles_email` - Búsqueda por email
- `idx_profiles_phone` - Búsqueda por teléfono
- `idx_profiles_profile_completed` - Filtrado por perfiles completos
- `idx_profiles_role` - Filtrado por roles

**Relaciones:**
- **1:N** con `listings` (como host_id)
- **1:N** con `bookings` (como user_id)
- **1:1** con `subscriptions` (como user_id)

---

### **listings** - Anuncios de Alojamientos y Vehículos
```sql
CREATE TABLE listings (
    id                      BIGINT PRIMARY KEY,        -- ID único del anuncio
    host_id                 UUID NOT NULL,             -- FK a profiles.id
    title                   TEXT NOT NULL,             -- Título del anuncio
    description             TEXT,                      -- Descripción detallada
    location                TEXT,                      -- Ubicación en La Gomera
    price_per_night_or_day  NUMERIC NOT NULL,          -- Precio por noche/día
    type                    listing_type NOT NULL,     -- 'accommodation' | 'vehicle'
    images_urls             TEXT[],                    -- Array de URLs de imágenes
    is_active               BOOLEAN DEFAULT false,     -- ¿Anuncio activo?
    created_at              TIMESTAMPTZ DEFAULT now()  -- Fecha de creación
);
```

**Constraints:**
```sql
FOREIGN KEY (host_id) REFERENCES profiles(id)
```

**Relaciones:**
- **N:1** con `profiles` (host_id)
- **1:1** con `listing_details_accommodation` (condicional)
- **1:1** con `listing_details_vehicle` (condicional)
- **1:N** con `bookings`

---

### **listing_details_accommodation** - Detalles de Alojamientos
```sql
CREATE TABLE listing_details_accommodation (
    listing_id      BIGINT PRIMARY KEY,           -- FK a listings.id
    max_guests      INTEGER,                      -- Máximo de huéspedes
    bedrooms        INTEGER,                      -- Número de dormitorios
    bathrooms       INTEGER,                      -- Número de baños
    features        TEXT[]                        -- Array de servicios/comodidades
);
```

**Constraints:**
```sql
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
```

**Uso:** Solo para `listings.type = 'accommodation'`

---

### **listing_details_vehicle** - Detalles de Vehículos
```sql
CREATE TABLE listing_details_vehicle (
    listing_id      BIGINT PRIMARY KEY,           -- FK a listings.id
    fuel            TEXT,                         -- Tipo de combustible
    transmission    TEXT,                         -- Tipo de transmisión
    seats           INTEGER,                      -- Número de asientos
    vehicle_type    TEXT,                         -- Tipo de vehículo
    features        TEXT[]                        -- Array de características
);
```

**Constraints:**
```sql
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
```

**Uso:** Solo para `listings.type = 'vehicle'`

**Valores Comunes:**
- **fuel:** `'gasoline'`, `'diesel'`, `'electric'`, `'hybrid'`, `'none'`
- **transmission:** `'manual'`, `'automatic'`, `'none'`
- **vehicle_type:** `'car'`, `'suv'`, `'van'`, `'motorcycle'`, `'bike'`

---

### **bookings** - Sistema de Reservas
```sql
CREATE TABLE bookings (
    id              BIGINT PRIMARY KEY,           -- ID único de reserva
    listing_id      BIGINT NOT NULL,              -- FK a listings.id
    user_id         UUID NOT NULL,                -- FK a profiles.id
    start_date      DATE NOT NULL,                -- Fecha de inicio
    end_date        DATE NOT NULL,                -- Fecha de fin
    total_price     NUMERIC NOT NULL,             -- Precio total
    deposit_paid    BOOLEAN DEFAULT false,        -- ¿Depósito pagado?
    status          booking_status NOT NULL,      -- Estado de la reserva
    created_at      TIMESTAMPTZ DEFAULT now()     -- Fecha de creación
);
```

**Constraints:**
```sql
FOREIGN KEY (listing_id) REFERENCES listings(id)
FOREIGN KEY (user_id) REFERENCES profiles(id)
```

**Flujo de Estados:**
1. `pending_confirmation` - Pendiente confirmación del host
2. `confirmed` - Confirmada por el host
3. `cancelled` - Cancelada

---

### **subscriptions** - Sistema de Suscripciones
```sql
CREATE TABLE subscriptions (
    id                      BIGINT PRIMARY KEY,        -- ID único
    user_id                 UUID UNIQUE NOT NULL,      -- FK a profiles.id
    plan                    subscription_plan NOT NULL, -- Plan de suscripción
    status                  subscription_status NOT NULL, -- Estado
    stripe_subscription_id  TEXT UNIQUE,               -- ID de Stripe
    stripe_customer_id      TEXT,                      -- Customer ID de Stripe
    created_at              TIMESTAMPTZ DEFAULT now(), -- Fecha de creación
    updated_at              TIMESTAMPTZ DEFAULT now()  -- Última actualización
);
```

**Constraints:**
```sql
FOREIGN KEY (user_id) REFERENCES profiles(id)
UNIQUE (stripe_subscription_id)
UNIQUE (user_id) -- Un usuario solo puede tener una suscripción
```

**Límites por Plan:**
- **básico:** 1 anuncio (€9.99/mes)
- **premium:** 5 anuncios (€19.99/mes)
- **diamante:** ∞ anuncios (€39.99/mes)

---

## 🏷️ Tipos de Datos Personalizados (Enums)

### **listing_type**
```sql
CREATE TYPE listing_type AS ENUM (
    'accommodation',    -- Alojamientos
    'vehicle'          -- Vehículos
);
```

### **booking_status**
```sql
CREATE TYPE booking_status AS ENUM (
    'pending_confirmation',  -- Pendiente confirmación
    'confirmed',            -- Confirmada
    'cancelled'             -- Cancelada
);
```

### **subscription_plan**
```sql
CREATE TYPE subscription_plan AS ENUM (
    'básico',      -- Plan básico (1 anuncio)
    'premium',     -- Plan premium (5 anuncios)
    'diamante'     -- Plan diamante (∞ anuncios)
);
```

### **subscription_status**
```sql
CREATE TYPE subscription_status AS ENUM (
    'active',      -- Activa
    'canceled',    -- Cancelada
    'past_due',    -- Pagos atrasados
    'paused',      -- Pausada
    'cancelled'    -- Cancelada (duplicado para compatibilidad)
);
```

---

## 🔐 Políticas de Seguridad (RLS)

### **profiles** - Políticas de Usuarios
```sql
-- Acceso propio: Los usuarios pueden gestionar su propio perfil
CREATE POLICY "profiles_own_access" ON profiles
    FOR ALL USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Acceso administrativo: Los admins pueden gestionar todos los perfiles
CREATE POLICY "profiles_admin_select" ON profiles
    FOR SELECT USING (is_admin_user(auth.uid()));

CREATE POLICY "profiles_admin_all" ON profiles
    FOR UPDATE USING (is_admin_user(auth.uid()))
    WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "profiles_admin_insert" ON profiles
    FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "profiles_admin_delete" ON profiles
    FOR DELETE USING (is_admin_user(auth.uid()));

-- Acceso de servicio: Para funciones del sistema
CREATE POLICY "profiles_service_access" ON profiles
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
```

### **subscriptions** - Políticas de Suscripciones
```sql
-- Los usuarios pueden ver y actualizar sus propias suscripciones
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Los admins pueden gestionar todas las suscripciones
CREATE POLICY "Admin can view all subscriptions" ON subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin can insert subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin can update all subscriptions" ON subscriptions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin can delete subscriptions" ON subscriptions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Acceso de servicio para webhooks y operaciones del sistema
CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
    FOR ALL USING (auth.role() = 'service_role');
```

---

## ⚙️ Funciones Personalizadas

### **is_admin_user(user_id UUID)** - Verificación de Admin
```sql
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
$$ LANGUAGE SQL;
```

**Uso:** Verificar si un usuario tiene permisos de administrador de forma segura.

### **handle_new_user()** - Trigger para Nuevos Usuarios
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, profile_completed)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'user',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Uso:** Crear automáticamente un perfil cuando se registra un nuevo usuario en auth.users.

### **update_profiles_updated_at()** - Actualizar Timestamp
```sql
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### **update_subscriptions_updated_at()** - Actualizar Timestamp
```sql
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔄 Triggers Automáticos

### **Triggers en profiles**
```sql
CREATE TRIGGER update_profiles_updated_at_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profiles_updated_at();
```

### **Triggers en subscriptions**
```sql
CREATE TRIGGER update_subscriptions_updated_at_trigger
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at();
```

---

## 📈 Optimizaciones de Performance

### **Índices Implementados**
```sql
-- Índices en profiles para búsquedas frecuentes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_profile_completed ON profiles(profile_completed);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Índices únicos en subscriptions
CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_key ON subscriptions(stripe_subscription_id);
CREATE UNIQUE INDEX subscriptions_user_id_key ON subscriptions(user_id);
```

### **Índices Recomendados para Implementar** (Fase 1: Performance)
```sql
-- Para mejorar queries en listings
CREATE INDEX idx_listings_type_status ON listings(type, is_active);
CREATE INDEX idx_listings_host_active ON listings(host_id, is_active);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);

-- Para mejorar queries en bookings
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
```

---

## 🚀 Queries Comunes Optimizados

### **Buscar Listings Activos por Tipo**
```sql
SELECT l.*, p.full_name as host_name
FROM listings l
JOIN profiles p ON l.host_id = p.id
WHERE l.type = 'accommodation' 
AND l.is_active = true
ORDER BY l.created_at DESC;
```

### **Obtener Reservas con Detalles Completos**
```sql
SELECT 
    b.*,
    l.title as listing_title,
    l.type as listing_type,
    host.full_name as host_name,
    guest.full_name as guest_name
FROM bookings b
JOIN listings l ON b.listing_id = l.id
JOIN profiles host ON l.host_id = host.id
JOIN profiles guest ON b.user_id = guest.id
WHERE b.status = 'confirmed'
ORDER BY b.start_date DESC;
```

### **Verificar Límites de Suscripción**
```sql
SELECT 
    p.id,
    p.full_name,
    s.plan,
    COUNT(l.id) as current_listings,
    CASE s.plan
        WHEN 'básico' THEN 1
        WHEN 'premium' THEN 5
        WHEN 'diamante' THEN 999
        ELSE 0
    END as listing_limit
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id AND s.status = 'active'
LEFT JOIN listings l ON p.id = l.host_id AND l.is_active = true
WHERE p.role = 'user'
GROUP BY p.id, p.full_name, s.plan;
```

### **Analytics Dashboard Query**
```sql
-- Estadísticas generales para admin dashboard
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE role = 'user') as total_users,
    (SELECT COUNT(*) FROM profiles WHERE is_host = true) as total_hosts,
    (SELECT COUNT(*) FROM listings WHERE is_active = true) as active_listings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 'confirmed') as total_revenue,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions;
```

---

## 🛡️ Seguridad y Compliance

### **Características de Seguridad Implementadas**
- ✅ **Row Level Security (RLS)** habilitado en todas las tablas
- ✅ **Función SECURITY DEFINER** para verificación de admin
- ✅ **Políticas granulares** por tipo de operación (SELECT, INSERT, UPDATE, DELETE)
- ✅ **Acceso basado en roles** (user, admin, service_role)
- ✅ **Protección contra recursión infinita** en políticas RLS

### **GDPR Compliance**
- ✅ **Eliminación en cascada** configurada para listings → details
- ✅ **Soft delete capability** via is_active flags
- ✅ **Audit trail** con created_at y updated_at timestamps
- ✅ **Data export capability** via queries SQL estándar

### **Best Practices Implementadas**
- ✅ **Constrains de integridad referencial** en todas las FK
- ✅ **Valores por defecto** apropiados para campos opcionales
- ✅ **Tipos de datos específicos** para mejor performance
- ✅ **Naming conventions** consistentes y descriptivas

---

## 📋 Checklist de Mantenimiento

### **Tareas Rutinarias**
- [ ] **Vacuum y Analyze** semanal para optimización
- [ ] **Backup automático** diario configurado
- [ ] **Monitoring de performance** de queries lentas
- [ ] **Audit de políticas RLS** mensual

### **Métricas a Monitorear**
- [ ] **Tiempo de respuesta** de queries principales
- [ ] **Uso de índices** en queries frecuentes
- [ ] **Crecimiento de datos** por tabla
- [ ] **Errores de integridad referencial**

### **Alertas Configuradas**
- [ ] **Espacio en disco** < 20%
- [ ] **Queries lentas** > 1 segundo
- [ ] **Errores de conexión** > 5 por minuto
- [ ] **Fallos de políticas RLS**

---

## 🔄 Diagrama de Relaciones

```
auth.users (Supabase)
    │
    │ 1:1
    ▼
profiles (id: UUID)
    │
    ├── 1:N ──► listings (host_id: UUID)
    │               │
    │               ├── 1:1 ──► listing_details_accommodation (listing_id: BIGINT)
    │               ├── 1:1 ──► listing_details_vehicle (listing_id: BIGINT)
    │               └── 1:N ──► bookings (listing_id: BIGINT)
    │                               │
    │                               └── N:1 ──► profiles (user_id: UUID)
    │
    └── 1:1 ──► subscriptions (user_id: UUID)
```

---

## 📚 Referencias y Documentación

### **Supabase Docs**
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Triggers](https://supabase.com/docs/guides/database/triggers)

### **PostgreSQL Docs**
- [Enum Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [Array Types](https://www.postgresql.org/docs/current/arrays.html)
- [Indexes](https://www.postgresql.org/docs/current/indexes.html)

### **Schema Version**
- **Versión Actual:** 1.4.0
- **Última Actualización:** Octubre 2025
- **Cambios Recientes:** 
  - Agregados campos `fuel` y `transmission` a `listing_details_vehicle`
  - Optimizados índices en `profiles`
  - Refinadas políticas RLS para mejor performance