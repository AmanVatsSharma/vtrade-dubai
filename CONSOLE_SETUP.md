# Console Setup Guide

This guide explains how to set up the real user data console functionality.

## Prisma Schema Updates

The Prisma schema has been updated with new tables for console functionality:

- `BankAccount` - User bank accounts for deposits/withdrawals
- `Deposit` - Deposit requests and history
- `Withdrawal` - Withdrawal requests and history  
- `UserProfile` - Extended user profile information

## Supabase RPC Functions

To enable the console functionality, you need to run the SQL functions in your Supabase database. The functions are located in `supabase-rpc-functions.sql`.

### Setup Steps:

1. **Run the migration** (when database is available):
   ```bash
   npx prisma migrate dev --name add_console_tables
   ```

2. **Execute the RPC functions in Supabase**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase-rpc-functions.sql`
   - Execute the SQL

3. **Update environment variables**:
   Make sure your `.env` file has the correct Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

## RPC Functions Included

### `get_user_console_data(user_id_param UUID)`
Returns all console data for a user in a single call:
- User information
- Trading account details
- Bank accounts
- Deposits and withdrawals
- Transactions
- Positions and orders
- User profile
- Summary statistics

### `update_user_profile(user_id_param UUID, profile_data JSON)`
Updates or creates user profile information.

### `add_bank_account(user_id_param UUID, bank_data JSON)`
Adds a new bank account for the user.

### `update_bank_account(user_id_param UUID, account_id_param UUID, bank_data JSON)`
Updates an existing bank account.

### `delete_bank_account(user_id_param UUID, account_id_param UUID)`
Soft deletes a bank account.

### `create_deposit_request(user_id_param UUID, deposit_data JSON)`
Creates a new deposit request.

### `create_withdrawal_request(user_id_param UUID, withdrawal_data JSON)`
Creates a new withdrawal request.

## Console Components Updated

All console sections now use real data instead of mock data:

- **Profile Section**: Shows real user data and KYC status
- **Account Section**: Displays actual trading account balance and positions
- **Deposits Section**: Real deposit history and ability to create new requests
- **Withdrawals Section**: Real withdrawal history and ability to create new requests
- **Bank Accounts Section**: Real bank account management
- **Statements Section**: Real transaction history

## Data Flow

1. User logs in and navigates to `/console`
2. `useConsoleData` hook fetches all data via `get_user_console_data` RPC
3. Components display real data with loading/error states
4. User actions (add bank account, create deposit, etc.) call appropriate RPC functions
5. Data is refreshed after successful operations

## Error Handling

All components include proper error handling:
- Loading states while fetching data
- Error messages for failed operations
- Toast notifications for user actions
- Graceful fallbacks for missing data

## Testing

To test the console functionality:

1. Ensure you have a user account with a trading account
2. Navigate to `/console`
3. Try adding a bank account
4. Create a deposit request
5. Create a withdrawal request
6. Verify data persists and updates correctly

## Notes

- The console now fetches all data in a single RPC call for better performance
- All user actions are properly validated and logged
- The system maintains data consistency across all operations
- Loading states provide good user experience during data operations