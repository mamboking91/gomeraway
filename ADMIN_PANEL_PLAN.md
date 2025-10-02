# 🏗️ Plan Integral: Panel de Administrador GomeraWay

## 📋 **OBJETIVO PRINCIPAL**
Crear un panel de administrador completo para gestionar membresias de hosts, controlar límites de anuncios según el plan de suscripción, y supervisar toda la plataforma.

---

## 🔍 **ANÁLISIS DEL SISTEMA ACTUAL**

### **📊 Estado de Suscripciones:**
- ✅ **Planes Definidos:**
  - **Básico:** €10/mes → 1 anuncio activo
  - **Premium:** €25/mes → 5 anuncios activos  
  - **Diamante:** €50/mes → Anuncios ilimitados

- ✅ **Infraestructura Existente:**
  - MembershipPage con integración Stripe
  - Webhook que registra suscripciones en tabla `subscriptions`
  - Campos: `user_id`, `plan`, `status`, `stripe_subscription_id`

- ❌ **Faltantes Críticos:**
  - **NO hay enforcement de límites de anuncios**
  - **NO hay verificación de plan antes de crear listings**
  - **NO hay panel admin para gestionar suscripciones**
  - **NO hay sistema de upgrade/downgrade**

### **🚨 Problemas Identificados:**
1. Los hosts pueden crear anuncios ilimitados sin restricciones
2. No hay validación de plan activo
3. No hay gestión administrativa de membresias
4. No hay visibilidad de uso vs límites

---

## 🎯 **FASES DE IMPLEMENTACIÓN**

### **Fase 1: Enforcement de Límites (Core)**
**Objetivo:** Implementar verificación de límites de anuncios basados en suscripción

#### **1.1 Backend: Verificación de Límites**
- [ ] **Crear función `checkListingLimits(userId)`**
  - Obtener plan activo del usuario
  - Contar anuncios activos actuales
  - Retornar si puede crear más anuncios
  
- [ ] **Modificar CreateListing**
  - Verificar límites antes de permitir creación
  - Mostrar mensaje explicativo si excede límite
  - Sugerir upgrade de plan

- [ ] **Modificar ActivateListing**
  - Verificar límites antes de activar anuncios
  - Prevenir activación si excede plan

#### **1.2 Frontend: UI de Límites**
- [ ] **Dashboard Host: Mostrar Uso Actual**
  - Indicador visual: "2/5 anuncios" (Premium)
  - Barra de progreso de uso
  - Link a upgrade de plan

- [ ] **CreateListing: Validación UI**
  - Warning si está cerca del límite
  - Bloqueador si excede límite
  - CTA para upgrade

### **Fase 2: Panel de Administrador (Core)**
**Objetivo:** Dashboard completo para gestión administrativa

#### **2.1 Estructura y Navegación**
- [ ] **Crear AdminDashboard page**
  - Ruta protegida `/admin`
  - Verificación de rol admin
  - Layout con sidebar de navegación

- [ ] **Sistema de Roles**
  - Agregar campo `role` a tabla profiles
  - Valores: 'user', 'host', 'admin'
  - Middleware de verificación

#### **2.2 Gestión de Suscripciones**
- [ ] **Vista "Suscripciones Activas"**
  - Lista de todos los hosts con suscripciones
  - Filtros por plan, estado, fecha
  - Búsqueda por nombre/email

- [ ] **Acciones Administrativas**
  - Pausar/reactivar suscripción
  - Cambiar plan manualmente
  - Ver historial de pagos
  - Cancelar suscripción

#### **2.3 Gestión de Anuncios**
- [ ] **Vista "Todos los Anuncios"**
  - Lista global con filtros
  - Ver por plan del host
  - Acciones: activar/desactivar/eliminar

- [ ] **Control de Límites**
  - Overrides administrativos
  - Extensiones temporales
  - Audit log de cambios

#### **2.4 Analytics y Reporting**
- [ ] **Dashboard Principal**
  - Métricas de suscripciones por plan
  - Ingresos mensuales
  - Uso de anuncios vs límites
  - Hosts activos vs total

- [ ] **Reportes Financieros**
  - Ingresos por plan
  - Churn rate por plan
  - Proyecciones de crecimiento

### **Fase 3: Funcionalidades Avanzadas**
**Objetivo:** Features avanzados para optimización de negocio

#### **3.1 Gestión de Usuarios**
- [ ] **Panel de Usuarios**
  - Lista de todos los usuarios
  - Promover a host/admin
  - Suspender cuentas
  - Ver actividad

#### **3.2 Moderación de Contenido**
- [ ] **Queue de Moderación**
  - Anuncios pendientes de revisión
  - Sistema de reportes
  - Aprobación/rechazo masivo

#### **3.3 Configuración Global**
- [ ] **Settings de Plataforma**
  - Modificar límites de planes
  - Configurar precios
  - Features flags
  - Mantenimiento mode

---

## 🗄️ **CAMBIOS EN BASE DE DATOS**

### **Nuevas Tablas Requeridas:**
```sql
-- Agregar campo role a profiles
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'host', 'admin'));

-- Tabla para audit logs
CREATE TABLE admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'listing', 'subscription'
  target_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para configuración global
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Modificaciones Existentes:**
```sql
-- Agregar campos útiles a subscriptions
ALTER TABLE subscriptions ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN expires_at TIMESTAMP;

-- Índices para performance
CREATE INDEX idx_listings_host_active ON listings(host_id, is_active);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
```

---

## 🛠️ **ARQUITECTURA TÉCNICA**

### **Frontend Structure:**
```
src/
├── pages/admin/
│   ├── AdminDashboard.tsx       # Panel principal
│   ├── SubscriptionsManager.tsx # Gestión suscripciones
│   ├── ListingsManager.tsx      # Gestión anuncios
│   ├── UsersManager.tsx         # Gestión usuarios
│   └── Analytics.tsx            # Reportes y métricas
├── components/admin/
│   ├── AdminLayout.tsx          # Layout del panel
│   ├── SubscriptionCard.tsx     # Tarjeta de suscripción
│   ├── LimitIndicator.tsx       # Indicador de límites
│   └── AdminCharts.tsx          # Gráficos y métricas
├── hooks/
│   ├── useSubscriptionLimits.ts # Hook para límites
│   └── useAdminActions.ts       # Hook para acciones admin
```

### **Backend Functions:**
```
supabase/functions/
├── check-listing-limits/        # Verificar límites
├── admin-actions/              # Acciones administrativas
├── subscription-management/    # Gestión suscripciones
└── platform-analytics/        # Métricas y reportes
```

---

## 🔐 **SEGURIDAD Y PERMISOS**

### **Role-Based Access Control:**
- **User:** Solo sus propios datos
- **Host:** Sus listings + reservas recibidas
- **Admin:** Acceso completo + logs de auditoría

### **Verificaciones de Seguridad:**
- [ ] Middleware de autenticación admin
- [ ] Rate limiting en endpoints admin
- [ ] Audit log de todas las acciones
- [ ] Encriptación de datos sensibles

---

## 📈 **MÉTRICAS DE ÉXITO**

### **KPIs a Trackear:**
1. **Enforcement de Límites:**
   - % de hosts que respetan límites
   - Intentos de exceder límites
   - Conversiones a plans superiores

2. **Uso del Panel Admin:**
   - Tiempo promedio de gestión
   - Acciones más utilizadas
   - Errores administrativos

3. **Business Impact:**
   - Incremento en upgrades de plan
   - Reducción en soporte manual
   - Satisfacción de hosts

---

## 🚀 **CRONOGRAMA ESTIMADO**

### **Sprint 1 (Semana 1): Enforcement Básico**
- Implementar verificación de límites
- Modificar CreateListing con validación
- UI básica de límites en dashboard host

### **Sprint 2 (Semana 2): Panel Admin Core**
- Crear AdminDashboard básico
- Sistema de roles y autenticación
- Vista de suscripciones con acciones básicas

### **Sprint 3 (Semana 3): Gestión Completa**
- Gestión de anuncios desde admin
- Analytics básicos
- Moderación de contenido

### **Sprint 4 (Semana 4): Refinamiento**
- Features avanzados
- Testing completo
- Performance optimization
- Documentation

---

## 🎯 **PRÓXIMOS PASOS INMEDIATOS**

### **Para Empezar (Orden de Prioridad):**

1. **✅ Implementar verificación de límites de anuncios**
   - Es el core del problema actual
   - Evita uso abusivo del sistema
   - Base para el resto de funcionalidades

2. **✅ Crear sistema de roles (user/host/admin)**
   - Foundational para todo el panel admin
   - Seguridad y permisos apropiados

3. **✅ Panel admin básico para gestión de suscripciones**
   - Vista y gestión de hosts
   - Control manual de límites

4. **✅ Analytics y reportes**
   - Métricas de negocio
   - Optimización de conversiones

---

## 💡 **CONSIDERACIONES ESPECIALES**

### **UX para Hosts:**
- Comunicación clara sobre límites
- Proceso fácil de upgrade
- Transparencia en uso actual

### **Business Logic:**
- Grandfathering de hosts existentes
- Períodos de gracia para downgrades
- Excepciones administrativas documentadas

### **Performance:**
- Caching de verificaciones de límites
- Lazy loading en listas administrativas
- Paginación en vistas grandes

---

**Estado:** 📋 **PLAN COMPLETO - Listo para Implementación**
**Próximo Paso:** Iniciar con Fase 1 - Enforcement de Límites