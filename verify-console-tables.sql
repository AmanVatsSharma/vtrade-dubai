-- Verification script for console tables migration
-- Run this after the migration to verify everything was created correctly

-- 1. Check if all tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles')
ORDER BY table_name;

-- 2. Check if all enums exist
SELECT 
    typname as enum_name,
    enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('DepositStatus', 'WithdrawalStatus')
ORDER BY typname, enumlabel;

-- 3. Check table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles')
ORDER BY table_name, ordinal_position;

-- 4. Check foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles')
ORDER BY tc.table_name, kcu.column_name;

-- 5. Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles')
ORDER BY tablename, indexname;

-- 6. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles')
ORDER BY tablename, policyname;

-- 7. Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles')
ORDER BY event_object_table, trigger_name;

-- 8. Test data insertion (optional - only if you want to test)
-- Uncomment and modify the user_id if you want to test data insertion

/*
-- Test bank account insertion
INSERT INTO "bank_accounts" (user_id, bank_name, account_number, ifsc_code, account_holder_name, account_type, is_default)
VALUES ('your-user-id-here', 'Test Bank', '1234567890', 'TEST0001234', 'Test User', 'savings', true)
ON CONFLICT (user_id, account_number) DO NOTHING;

-- Test user profile insertion
INSERT INTO "user_profiles" (user_id, first_name, last_name, risk_profile)
VALUES ('your-user-id-here', 'Test', 'User', 'MODERATE')
ON CONFLICT (user_id) DO NOTHING;

-- Check if test data was inserted
SELECT * FROM "bank_accounts" WHERE user_id = 'your-user-id-here';
SELECT * FROM "user_profiles" WHERE user_id = 'your-user-id-here';
*/

-- 9. Summary report
DO $$
DECLARE
    table_count INTEGER;
    enum_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles');
    
    -- Count enums
    SELECT COUNT(DISTINCT typname) INTO enum_count
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE typname IN ('DepositStatus', 'WithdrawalStatus');
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles');
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles');
    
    -- Count triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles');
    
    RAISE NOTICE '=== CONSOLE TABLES MIGRATION VERIFICATION ===';
    RAISE NOTICE 'Tables created: %/4', table_count;
    RAISE NOTICE 'Enums created: %/2', enum_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'RLS policies created: %', policy_count;
    RAISE NOTICE 'Triggers created: %', trigger_count;
    
    IF table_count = 4 AND enum_count = 2 THEN
        RAISE NOTICE '✅ Migration completed successfully!';
        RAISE NOTICE 'You can now run the RPC functions from supabase-rpc-functions.sql';
    ELSE
        RAISE NOTICE '❌ Migration incomplete. Please check the errors above.';
    END IF;
END $$;