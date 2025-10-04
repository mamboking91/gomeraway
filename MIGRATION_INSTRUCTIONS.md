# 🗃️ Instrucciones de Migración de Base de Datos

## 📋 Resumen

Esta migración añade las columnas faltantes a las tablas de detalles de listings y corrige inconsistencias entre el UI y la base de datos.

## 🔧 Cambios a Realizar

### Tabla `listing_details_vehicle`
- ✅ **Añadir:** `vehicle_type TEXT` - Tipo de vehículo (car, suv, van, etc.)
- ✅ **Añadir:** `features TEXT[]` - Array de características/extras
- ✅ **Mantener:** `fuel`, `transmission`, `seats` existentes

### Tabla `listing_details_accommodation`  
- ✅ **Verificar:** `features TEXT[]` como array
- ✅ **Renombrar:** `guests` → `max_guests` (si es necesario)
- ✅ **Mantener:** `bedrooms`, `bathrooms` existentes

## 🚀 Cómo Ejecutar la Migración

### Opción 1: Usando psql (Recomendado)
```bash
# Conectar a tu base de datos Supabase/PostgreSQL
psql "postgresql://user:password@host:port/database"

# Ejecutar el script de migración
\i database-migration-listing-details.sql
```

### Opción 2: Usando Supabase Dashboard
1. Ve al Dashboard de Supabase
2. Navega a **SQL Editor**
3. Copia y pega el contenido de `database-migration-listing-details.sql`
4. Ejecuta el script

### Opción 3: Usando DBeaver/pgAdmin
1. Abre tu cliente de base de datos favorito
2. Conéctate a tu base de datos
3. Abre el archivo `database-migration-listing-details.sql`
4. Ejecuta el script completo

## ✅ Verificación Post-Migración

Después de ejecutar la migración, verifica que:

1. **Columnas nuevas existen:**
   ```sql
   \d listing_details_vehicle
   \d listing_details_accommodation
   ```

2. **Datos migrados correctamente:**
   ```sql
   SELECT COUNT(*) FROM listing_details_vehicle WHERE vehicle_type IS NOT NULL;
   SELECT COUNT(*) FROM listing_details_accommodation WHERE features IS NOT NULL;
   ```

3. **Índices creados:**
   ```sql
   \di *listing_details*
   ```

## 🔄 Rollback (Si es necesario)

Si necesitas revertir los cambios:

```sql
-- Para listing_details_vehicle
ALTER TABLE listing_details_vehicle DROP COLUMN IF EXISTS vehicle_type;
ALTER TABLE listing_details_vehicle DROP COLUMN IF EXISTS features;

-- Para listing_details_accommodation (solo si se renombró)
ALTER TABLE listing_details_accommodation RENAME COLUMN max_guests TO guests;
```

## 📝 Cambios en el Código

Los siguientes archivos han sido actualizados para usar la nueva estructura:

- ✅ `src/pages/CreateListing.tsx`
- ✅ `src/pages/EditListing.tsx`
- ✅ Mapeo correcto: `amenities` (UI) → `features` (DB) como array
- ✅ Mapeo correcto: `vehicle_type` directamente (ya no va a `fuel`)

## 🎯 Beneficios

1. **Consistencia:** UI y DB ahora coinciden perfectamente
2. **Funcionalidad:** Guardar/editar detalles funciona correctamente
3. **Futuro:** Preparado para añadir campos de combustible y transmisión
4. **Performance:** Índices añadidos para búsquedas optimizadas

## ⚠️ Notas Importantes

- ✅ La migración es **segura** - no elimina datos existentes
- ✅ Usa `IF NOT EXISTS` para evitar errores si ya está aplicada
- ✅ Incluye migración automática de datos existentes
- ⚠️ **Backup recomendado** antes de ejecutar en producción

## 🆘 Soporte

Si encuentras algún problema:

1. Verifica que tienes permisos para ALTER TABLE
2. Revisa los logs de PostgreSQL para errores específicos
3. Asegúrate de que la conexión a la DB es estable
4. Contacta al equipo de desarrollo si necesitas ayuda