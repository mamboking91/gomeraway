-- FIX FINAL: Solución definitiva para la recursión infinita en RLS policies
-- Problema: Las policies de admin consultan la tabla profiles para verificar rol,
-- creando recursión infinita cuando intentan acceder a profiles

-- 1. Temporalmente deshabilitar RLS para trabajar sin restricciones
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas existentes para empezar limpio
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON profiles';
        RAISE NOTICE 'Eliminada policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 3. Asegurar que tu usuario sea admin
UPDATE profiles 
SET role = 'admin', profile_completed = true
WHERE email = 'alejandroramirezdepaz@gmail.com';

-- 4. Crear función auxiliar para verificar admin sin recursión
-- Esta función usa SECURITY DEFINER para ejecutarse con permisos del owner
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
$$;

-- 5. Re-habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas simples y sin recursión

-- Política 1: Los usuarios pueden ver/editar su propio perfil
CREATE POLICY "profiles_own_access" ON profiles
    FOR ALL 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política 2: Acceso completo para service_role (sistema)
CREATE POLICY "profiles_service_access" ON profiles
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Política 3: Los admins pueden ver todo (usando función auxiliar)
CREATE POLICY "profiles_admin_select" ON profiles
    FOR SELECT 
    USING (is_admin_user(auth.uid()));

-- Política 4: Los admins pueden modificar todo
CREATE POLICY "profiles_admin_all" ON profiles
    FOR UPDATE 
    USING (is_admin_user(auth.uid()))
    WITH CHECK (is_admin_user(auth.uid()));

-- Política 5: Los admins pueden insertar perfiles
CREATE POLICY "profiles_admin_insert" ON profiles
    FOR INSERT
    WITH CHECK (is_admin_user(auth.uid()));

-- Política 6: Los admins pueden eliminar perfiles
CREATE POLICY "profiles_admin_delete" ON profiles
    FOR DELETE
    USING (is_admin_user(auth.uid()));

-- 7. Verificar que las políticas están activas
SELECT 
    'Políticas creadas' as estado,
    policyname,
    cmd as operacion
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 8. Verificar acceso del usuario actual
SELECT 
    'Usuario actual' as info,
    auth.uid() as user_id,
    p.email,
    p.role,
    is_admin_user(auth.uid()) as es_admin
FROM profiles p
WHERE p.id = auth.uid();

-- 9. Test final: ¿Puede el admin ver todos los perfiles?
SELECT 
    'Test final - perfiles visibles' as info,
    COUNT(*) as total_visibles
FROM profiles;

-- 10. Mostrar todos los perfiles para verificar
SELECT 
    'Todos los perfiles' as info,
    id,
    email,
    role,
    profile_completed,
    updated_at
FROM profiles
ORDER BY 
    CASE WHEN role = 'admin' THEN 1 ELSE 2 END,
    updated_at DESC;