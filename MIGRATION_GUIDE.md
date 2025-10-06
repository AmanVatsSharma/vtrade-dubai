# Console Tables Migration Guide

This guide will help you safely add the console tables to your existing database without losing any data.

## ⚠️ Important Notes

- **This migration is safe** - it only adds new tables and doesn't modify existing data
- **No existing data will be lost** - all current tables and data remain unchanged
- **Test in a development environment first** if possible
- **Backup your database** before running in production (good practice)

## Step-by-Step Migration Process

### Step 1: Prepare Your Environment

1. **Access your Supabase dashboard** or PostgreSQL database
2. **Navigate to the SQL Editor** in Supabase (or use your preferred PostgreSQL client)
3. **Ensure you have the necessary permissions** to create tables and functions

### Step 2: Run the Migration SQL

1. **Copy the contents** of `console-tables-migration.sql`
2. **Paste it into your SQL Editor**
3. **Execute the SQL** - this will:
   - Create 4 new tables: `bank_accounts`, `deposits`, `withdrawals`, `user_profiles`
   - Create 2 new enums: `DepositStatus`, `WithdrawalStatus`
   - Set up proper indexes for performance
   - Create RLS (Row Level Security) policies
   - Set up triggers for automatic timestamp updates

### Step 3: Verify the Migration

1. **Copy the contents** of `verify-console-tables.sql`
2. **Paste it into your SQL Editor**
3. **Execute the verification script** - this will:
   - Check if all tables were created
   - Verify all enums exist
   - Confirm indexes are in place
   - Validate RLS policies
   - Show a summary report

### Step 4: Run the RPC Functions

1. **Copy the contents** of `supabase-rpc-functions.sql`
2. **Paste it into your SQL Editor**
3. **Execute the RPC functions** - this will create all the necessary functions for console operations

### Step 5: Test the Console

1. **Start your Next.js application**
2. **Navigate to `/console`**
3. **Verify that the console loads without errors**
4. **Test adding a bank account**
5. **Test creating a deposit request**

## What Gets Created

### New Tables

1. **`bank_accounts`**
   - Stores user bank account information
   - Links to users table
   - Supports multiple accounts per user

2. **`deposits`**
   - Tracks deposit requests and history
   - Links to users and trading accounts
   - Optional link to bank accounts

3. **`withdrawals`**
   - Tracks withdrawal requests and history
   - Links to users, trading accounts, and bank accounts
   - Includes charges and processing status

4. **`user_profiles`**
   - Extended user profile information
   - One-to-one relationship with users
   - Includes KYC and risk profile data

### New Enums

1. **`DepositStatus`**: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
2. **`WithdrawalStatus`**: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED

### Security Features

- **Row Level Security (RLS)** enabled on all new tables
- **Policies** ensure users can only access their own data
- **Proper foreign key constraints** maintain data integrity
- **Indexes** for optimal query performance

## Troubleshooting

### If Migration Fails

1. **Check for existing tables** - the script will fail if tables already exist
2. **Verify permissions** - ensure you have CREATE TABLE permissions
3. **Check for naming conflicts** - ensure no existing objects have the same names

### If Verification Shows Issues

1. **Re-run the migration** - the script is idempotent for most operations
2. **Check the error messages** - they will indicate what went wrong
3. **Verify your database connection** - ensure you're connected to the right database

### If Console Doesn't Work

1. **Check browser console** for JavaScript errors
2. **Verify environment variables** are set correctly
3. **Ensure RPC functions** were created successfully
4. **Check Supabase logs** for any database errors

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS "withdrawals";
DROP TABLE IF EXISTS "deposits";
DROP TABLE IF EXISTS "bank_accounts";
DROP TABLE IF EXISTS "user_profiles";

-- Drop enums
DROP TYPE IF EXISTS "WithdrawalStatus";
DROP TYPE IF EXISTS "DepositStatus";

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Success Indicators

After successful migration, you should see:

✅ **4 tables created**: bank_accounts, deposits, withdrawals, user_profiles  
✅ **2 enums created**: DepositStatus, WithdrawalStatus  
✅ **Multiple indexes created** for performance  
✅ **RLS policies active** for security  
✅ **Triggers working** for automatic timestamps  
✅ **Console loads without errors**  
✅ **Can add bank accounts**  
✅ **Can create deposit/withdrawal requests**  

## Next Steps

Once the migration is complete:

1. **Update your Prisma schema** to match the new database structure
2. **Run `npx prisma generate`** to update the Prisma client
3. **Test all console functionality** thoroughly
4. **Deploy to production** when ready

## Support

If you encounter any issues:

1. **Check the verification script output** for specific error details
2. **Review the Supabase logs** for database errors
3. **Ensure all environment variables** are correctly set
4. **Verify your database permissions** are sufficient

The migration is designed to be safe and non-destructive, so your existing data will remain intact throughout the process.