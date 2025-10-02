-- Complete database schema and configuration information
-- Execute this and send the JSON results to Claude

-- 1. All tables with their columns and types
SELECT 
    'tables_and_columns' as info_type,
    json_agg(
        json_build_object(
            'table_name', table_name,
            'column_name', column_name,
            'data_type', data_type,
            'is_nullable', is_nullable,
            'column_default', column_default,
            'character_maximum_length', character_maximum_length
        ) ORDER BY table_name, ordinal_position
    ) as data
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name NOT LIKE 'pg_%';

-- 2. All RLS policies
SELECT 
    'rls_policies' as info_type,
    json_agg(
        json_build_object(
            'table_name', tablename,
            'policy_name', policyname,
            'command', cmd,
            'permissive', permissive,
            'roles', roles,
            'qual', qual,
            'with_check', with_check
        ) ORDER BY tablename, policyname
    ) as data
FROM pg_policies 
WHERE schemaname = 'public';

-- 3. All foreign key relationships
SELECT 
    'foreign_keys' as info_type,
    json_agg(
        json_build_object(
            'constraint_name', tc.constraint_name,
            'table_name', tc.table_name,
            'column_name', kcu.column_name,
            'foreign_table_name', ccu.table_name,
            'foreign_column_name', ccu.column_name
        ) ORDER BY tc.table_name
    ) as data
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public';

-- 4. All custom functions
SELECT 
    'custom_functions' as info_type,
    json_agg(
        json_build_object(
            'function_name', routine_name,
            'return_type', data_type,
            'language', external_language,
            'security_type', security_type
        ) ORDER BY routine_name
    ) as data
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- 5. All indexes
SELECT 
    'indexes' as info_type,
    json_agg(
        json_build_object(
            'table_name', tablename,
            'index_name', indexname,
            'index_definition', indexdef
        ) ORDER BY tablename, indexname
    ) as data
FROM pg_indexes 
WHERE schemaname = 'public';

-- 6. All triggers
SELECT 
    'triggers' as info_type,
    json_agg(
        json_build_object(
            'trigger_name', trigger_name,
            'table_name', event_object_table,
            'trigger_event', string_agg(event_manipulation, ', '),
            'action_timing', action_timing
        ) ORDER BY event_object_table, trigger_name
    ) as data
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
GROUP BY trigger_name, event_object_table, action_timing;

-- 7. Table constraints (primary keys, unique, check, etc.)
SELECT 
    'table_constraints' as info_type,
    json_agg(
        json_build_object(
            'constraint_name', constraint_name,
            'table_name', table_name,
            'constraint_type', constraint_type,
            'column_name', column_name
        ) ORDER BY table_name, constraint_name
    ) as data
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public';

-- 8. Current profiles data sample (first 5 records)
SELECT 
    'profiles_sample' as info_type,
    json_agg(
        json_build_object(
            'id', id,
            'email', email,
            'role', role,
            'profile_completed', profile_completed,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) as data
FROM (
    SELECT * FROM profiles 
    ORDER BY created_at DESC 
    LIMIT 5
) sample;

-- 9. Auth schema functions (Supabase auth functions)
SELECT 
    'auth_functions' as info_type,
    json_agg(
        json_build_object(
            'function_name', routine_name,
            'return_type', data_type
        ) ORDER BY routine_name
    ) as data
FROM information_schema.routines 
WHERE routine_schema = 'auth'
AND routine_type = 'FUNCTION';

-- 10. Extensions enabled
SELECT 
    'extensions' as info_type,
    json_agg(
        json_build_object(
            'extension_name', extname,
            'version', extversion
        ) ORDER BY extname
    ) as data
FROM pg_extension;