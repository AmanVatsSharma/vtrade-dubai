-- Console Tables Migration SQL
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database
-- This safely adds new tables and fields without affecting existing data

-- 1. Create new enums first
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- 2. Create BankAccount table
CREATE TABLE "bank_accounts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "bank_name" VARCHAR(255) NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "ifsc_code" VARCHAR(20) NOT NULL,
    "account_holder_name" VARCHAR(255) NOT NULL,
    "account_type" VARCHAR(20) DEFAULT 'savings',
    "is_default" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT "bank_accounts_user_id_account_number_key" UNIQUE ("user_id", "account_number")
);

-- Create indexes for bank_accounts
CREATE INDEX "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");

-- 3. Create Deposit table
CREATE TABLE "deposits" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "trading_account_id" UUID NOT NULL REFERENCES "trading_accounts"("id") ON DELETE CASCADE,
    "bank_account_id" UUID REFERENCES "bank_accounts"("id") ON DELETE SET NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "status" "DepositStatus" DEFAULT 'PENDING',
    "utr" VARCHAR(100),
    "reference" VARCHAR(100),
    "remarks" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for deposits
CREATE INDEX "deposits_user_id_idx" ON "deposits"("user_id");
CREATE INDEX "deposits_trading_account_id_idx" ON "deposits"("trading_account_id");
CREATE INDEX "deposits_status_idx" ON "deposits"("status");
CREATE INDEX "deposits_created_at_idx" ON "deposits"("created_at");

-- 4. Create Withdrawal table
CREATE TABLE "withdrawals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "trading_account_id" UUID NOT NULL REFERENCES "trading_accounts"("id") ON DELETE CASCADE,
    "bank_account_id" UUID NOT NULL REFERENCES "bank_accounts"("id") ON DELETE CASCADE,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "WithdrawalStatus" DEFAULT 'PENDING',
    "reference" VARCHAR(100),
    "remarks" TEXT,
    "charges" DECIMAL(18,2) DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for withdrawals
CREATE INDEX "withdrawals_user_id_idx" ON "withdrawals"("user_id");
CREATE INDEX "withdrawals_trading_account_id_idx" ON "withdrawals"("trading_account_id");
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");
CREATE INDEX "withdrawals_created_at_idx" ON "withdrawals"("created_at");

-- 5. Create UserProfile table
CREATE TABLE "user_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "date_of_birth" TIMESTAMP(3),
    "gender" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "pan_number" VARCHAR(20),
    "aadhaar_number" VARCHAR(20),
    "occupation" VARCHAR(100),
    "annual_income" DECIMAL(18,2),
    "risk_profile" VARCHAR(20) DEFAULT 'MODERATE',
    "investment_experience" VARCHAR(20),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- 6. Add new columns to existing trading_accounts table (if they don't exist)
-- Check if columns exist before adding them
DO $$
BEGIN
    -- Add deposits relation to trading_accounts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trading_accounts' 
        AND column_name = 'deposits'
    ) THEN
        -- This is handled by the foreign key relationships, no column needed
        NULL;
    END IF;
END $$;

-- 7. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_bank_accounts_updated_at 
    BEFORE UPDATE ON "bank_accounts" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at 
    BEFORE UPDATE ON "deposits" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at 
    BEFORE UPDATE ON "withdrawals" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON "user_profiles" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant necessary permissions (adjust based on your RLS policies)
-- These grants assume you're using RLS (Row Level Security)
-- You may need to adjust these based on your specific setup

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON "bank_accounts" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "deposits" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "withdrawals" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_profiles" TO authenticated;

-- Grant usage on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 9. Create RLS policies (Row Level Security)
-- Enable RLS on new tables
ALTER TABLE "bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deposits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "withdrawals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_accounts
CREATE POLICY "Users can view their own bank accounts" ON "bank_accounts"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON "bank_accounts"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON "bank_accounts"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON "bank_accounts"
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for deposits
CREATE POLICY "Users can view their own deposits" ON "deposits"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposits" ON "deposits"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deposits" ON "deposits"
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for withdrawals
CREATE POLICY "Users can view their own withdrawals" ON "withdrawals"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawals" ON "withdrawals"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own withdrawals" ON "withdrawals"
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON "user_profiles"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON "user_profiles"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON "user_profiles"
    FOR UPDATE USING (auth.uid() = user_id);

-- 10. Insert some sample data (optional - remove if not needed)
-- This is just for testing purposes
-- You can remove this section if you don't want sample data

-- Note: Only run this if you want sample data
-- Uncomment the following lines if you want to add sample data

/*
-- Sample bank account (replace with actual user_id)
-- INSERT INTO "bank_accounts" (user_id, bank_name, account_number, ifsc_code, account_holder_name, account_type, is_default)
-- VALUES ('your-user-id-here', 'HDFC Bank', '1234567890', 'HDFC0001234', 'John Doe', 'savings', true);
*/

-- 11. Verify the tables were created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles')
ORDER BY table_name, ordinal_position;

-- 12. Check if all indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('bank_accounts', 'deposits', 'withdrawals', 'user_profiles')
ORDER BY tablename, indexname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Console tables migration completed successfully!';
    RAISE NOTICE 'Tables created: bank_accounts, deposits, withdrawals, user_profiles';
    RAISE NOTICE 'Enums created: DepositStatus, WithdrawalStatus';
    RAISE NOTICE 'RLS policies and triggers applied';
    RAISE NOTICE 'You can now run the RPC functions from supabase-rpc-functions.sql';
END $$;