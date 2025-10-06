-- Supabase RPC Functions for Console Data Management
-- These functions provide efficient data access for the user console

-- Function to get all console data for a user at once
CREATE OR REPLACE FUNCTION get_user_console_data(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_data JSON;
    trading_account_data JSON;
    bank_accounts_data JSON;
    deposits_data JSON;
    withdrawals_data JSON;
    transactions_data JSON;
    positions_data JSON;
    orders_data JSON;
    user_profile_data JSON;
BEGIN
    -- Get user basic information
    SELECT json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email,
        'phone', u.phone,
        'clientId', u.client_id,
        'role', u.role,
        'isActive', u.is_active,
        'createdAt', u.created_at,
        'kycStatus', CASE 
            WHEN k.status IS NOT NULL THEN k.status::text
            ELSE 'NOT_SUBMITTED'
        END
    ) INTO user_data
    FROM users u
    LEFT JOIN kyc k ON u.id = k.user_id
    WHERE u.id = user_id_param;

    -- Get trading account data
    SELECT json_build_object(
        'id', ta.id,
        'balance', ta.balance,
        'availableMargin', ta.available_margin,
        'usedMargin', ta.used_margin,
        'clientId', ta.client_id,
        'createdAt', ta.created_at
    ) INTO trading_account_data
    FROM trading_accounts ta
    WHERE ta.user_id = user_id_param;

    -- Get bank accounts
    SELECT json_agg(
        json_build_object(
            'id', ba.id,
            'bankName', ba.bank_name,
            'accountNumber', ba.account_number,
            'ifscCode', ba.ifsc_code,
            'accountHolderName', ba.account_holder_name,
            'accountType', ba.account_type,
            'isDefault', ba.is_default,
            'isActive', ba.is_active,
            'createdAt', ba.created_at
        )
    ) INTO bank_accounts_data
    FROM bank_accounts ba
    WHERE ba.user_id = user_id_param AND ba.is_active = true;

    -- Get deposits
    SELECT json_agg(
        json_build_object(
            'id', d.id,
            'amount', d.amount,
            'method', d.method,
            'status', d.status,
            'utr', d.utr,
            'reference', d.reference,
            'remarks', d.remarks,
            'processedAt', d.processed_at,
            'createdAt', d.created_at,
            'bankAccount', CASE 
                WHEN ba.id IS NOT NULL THEN json_build_object(
                    'bankName', ba.bank_name,
                    'accountNumber', ba.account_number
                )
                ELSE NULL
            END
        ) ORDER BY d.created_at DESC
    ) INTO deposits_data
    FROM deposits d
    LEFT JOIN bank_accounts ba ON d.bank_account_id = ba.id
    WHERE d.user_id = user_id_param;

    -- Get withdrawals
    SELECT json_agg(
        json_build_object(
            'id', w.id,
            'amount', w.amount,
            'status', w.status,
            'reference', w.reference,
            'remarks', w.remarks,
            'charges', w.charges,
            'processedAt', w.processed_at,
            'createdAt', w.created_at,
            'bankAccount', json_build_object(
                'bankName', ba.bank_name,
                'accountNumber', ba.account_number,
                'ifscCode', ba.ifsc_code
            )
        ) ORDER BY w.created_at DESC
    ) INTO withdrawals_data
    FROM withdrawals w
    JOIN bank_accounts ba ON w.bank_account_id = ba.id
    WHERE w.user_id = user_id_param;

    -- Get transactions
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'amount', t.amount,
            'type', t.type,
            'description', t.description,
            'createdAt', t.created_at
        ) ORDER BY t.created_at DESC
    ) INTO transactions_data
    FROM transactions t
    JOIN trading_accounts ta ON t.trading_account_id = ta.id
    WHERE ta.user_id = user_id_param;

    -- Get positions
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'symbol', p.symbol,
            'quantity', p.quantity,
            'averagePrice', p.average_price,
            'unrealizedPnL', p.unrealized_pn_l,
            'dayPnL', p.day_pn_l,
            'stopLoss', p.stop_loss,
            'target', p.target,
            'createdAt', p.created_at,
            'stock', CASE 
                WHEN s.id IS NOT NULL THEN json_build_object(
                    'instrumentId', s.instrument_id,
                    'segment', s.segment,
                    'strikePrice', s.strike_price,
                    'optionType', s.option_type,
                    'expiry', s.expiry,
                    'lotSize', s.lot_size
                )
                ELSE NULL
            END
        ) ORDER BY p.created_at DESC
    ) INTO positions_data
    FROM positions p
    LEFT JOIN stock s ON p.stock_id = s.id
    JOIN trading_accounts ta ON p.trading_account_id = ta.id
    WHERE ta.user_id = user_id_param;

    -- Get orders
    SELECT json_agg(
        json_build_object(
            'id', o.id,
            'symbol', o.symbol,
            'quantity', o.quantity,
            'orderType', o.order_type,
            'orderSide', o.order_side,
            'price', o.price,
            'filledQuantity', o.filled_quantity,
            'averagePrice', o.average_price,
            'productType', o.product_type,
            'status', o.status,
            'createdAt', o.created_at,
            'executedAt', o.executed_at
        ) ORDER BY o.created_at DESC
    ) INTO orders_data
    FROM orders o
    JOIN trading_accounts ta ON o.trading_account_id = ta.id
    WHERE ta.user_id = user_id_param;

    -- Get user profile
    SELECT json_build_object(
        'id', up.id,
        'firstName', up.first_name,
        'lastName', up.last_name,
        'dateOfBirth', up.date_of_birth,
        'gender', up.gender,
        'address', up.address,
        'city', up.city,
        'state', up.state,
        'pincode', up.pincode,
        'panNumber', up.pan_number,
        'aadhaarNumber', up.aadhaar_number,
        'occupation', up.occupation,
        'annualIncome', up.annual_income,
        'riskProfile', up.risk_profile,
        'investmentExperience', up.investment_experience,
        'createdAt', up.created_at
    ) INTO user_profile_data
    FROM user_profiles up
    WHERE up.user_id = user_id_param;

    -- Build the complete result
    result := json_build_object(
        'user', user_data,
        'tradingAccount', trading_account_data,
        'bankAccounts', COALESCE(bank_accounts_data, '[]'::json),
        'deposits', COALESCE(deposits_data, '[]'::json),
        'withdrawals', COALESCE(withdrawals_data, '[]'::json),
        'transactions', COALESCE(transactions_data, '[]'::json),
        'positions', COALESCE(positions_data, '[]'::json),
        'orders', COALESCE(orders_data, '[]'::json),
        'userProfile', user_profile_data,
        'summary', json_build_object(
            'totalDeposits', COALESCE((SELECT SUM(amount) FROM deposits WHERE user_id = user_id_param AND status = 'COMPLETED'), 0),
            'totalWithdrawals', COALESCE((SELECT SUM(amount) FROM withdrawals WHERE user_id = user_id_param AND status = 'COMPLETED'), 0),
            'pendingDeposits', COALESCE((SELECT COUNT(*) FROM deposits WHERE user_id = user_id_param AND status IN ('PENDING', 'PROCESSING')), 0),
            'pendingWithdrawals', COALESCE((SELECT COUNT(*) FROM withdrawals WHERE user_id = user_id_param AND status IN ('PENDING', 'PROCESSING')), 0),
            'totalBankAccounts', COALESCE((SELECT COUNT(*) FROM bank_accounts WHERE user_id = user_id_param AND is_active = true), 0)
        )
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    user_id_param UUID,
    profile_data JSON
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    existing_profile_id UUID;
BEGIN
    -- Check if profile exists
    SELECT id INTO existing_profile_id
    FROM user_profiles
    WHERE user_id = user_id_param;

    IF existing_profile_id IS NOT NULL THEN
        -- Update existing profile
        UPDATE user_profiles SET
            first_name = COALESCE((profile_data->>'firstName')::text, first_name),
            last_name = COALESCE((profile_data->>'lastName')::text, last_name),
            date_of_birth = COALESCE((profile_data->>'dateOfBirth')::timestamp, date_of_birth),
            gender = COALESCE((profile_data->>'gender')::text, gender),
            address = COALESCE((profile_data->>'address')::text, address),
            city = COALESCE((profile_data->>'city')::text, city),
            state = COALESCE((profile_data->>'state')::text, state),
            pincode = COALESCE((profile_data->>'pincode')::text, pincode),
            pan_number = COALESCE((profile_data->>'panNumber')::text, pan_number),
            aadhaar_number = COALESCE((profile_data->>'aadhaarNumber')::text, aadhaar_number),
            occupation = COALESCE((profile_data->>'occupation')::text, occupation),
            annual_income = COALESCE((profile_data->>'annualIncome')::numeric, annual_income),
            risk_profile = COALESCE((profile_data->>'riskProfile')::text, risk_profile),
            investment_experience = COALESCE((profile_data->>'investmentExperience')::text, investment_experience),
            updated_at = NOW()
        WHERE id = existing_profile_id;
    ELSE
        -- Create new profile
        INSERT INTO user_profiles (
            id, user_id, first_name, last_name, date_of_birth, gender,
            address, city, state, pincode, pan_number, aadhaar_number,
            occupation, annual_income, risk_profile, investment_experience
        ) VALUES (
            gen_random_uuid(),
            user_id_param,
            (profile_data->>'firstName')::text,
            (profile_data->>'lastName')::text,
            (profile_data->>'dateOfBirth')::timestamp,
            (profile_data->>'gender')::text,
            (profile_data->>'address')::text,
            (profile_data->>'city')::text,
            (profile_data->>'state')::text,
            (profile_data->>'pincode')::text,
            (profile_data->>'panNumber')::text,
            (profile_data->>'aadhaarNumber')::text,
            (profile_data->>'occupation')::text,
            (profile_data->>'annualIncome')::numeric,
            (profile_data->>'riskProfile')::text,
            (profile_data->>'investmentExperience')::text
        );
    END IF;

    -- Return updated profile
    SELECT json_build_object(
        'success', true,
        'message', 'Profile updated successfully'
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add bank account
CREATE OR REPLACE FUNCTION add_bank_account(
    user_id_param UUID,
    bank_data JSON
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    new_account_id UUID;
    is_first_account BOOLEAN;
BEGIN
    -- Check if this is the first account
    SELECT COUNT(*) = 0 INTO is_first_account
    FROM bank_accounts
    WHERE user_id = user_id_param AND is_active = true;

    new_account_id := gen_random_uuid();

    -- Insert new bank account
    INSERT INTO bank_accounts (
        id, user_id, bank_name, account_number, ifsc_code,
        account_holder_name, account_type, is_default, is_active
    ) VALUES (
        new_account_id,
        user_id_param,
        (bank_data->>'bankName')::text,
        (bank_data->>'accountNumber')::text,
        (bank_data->>'ifscCode')::text,
        (bank_data->>'accountHolderName')::text,
        (bank_data->>'accountType')::text,
        is_first_account OR COALESCE((bank_data->>'isDefault')::boolean, false),
        true
    );

    -- If this account is set as default, unset others
    IF COALESCE((bank_data->>'isDefault')::boolean, false) OR is_first_account THEN
        UPDATE bank_accounts
        SET is_default = false
        WHERE user_id = user_id_param AND id != new_account_id;
    END IF;

    SELECT json_build_object(
        'success', true,
        'message', 'Bank account added successfully',
        'accountId', new_account_id
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update bank account
CREATE OR REPLACE FUNCTION update_bank_account(
    user_id_param UUID,
    account_id_param UUID,
    bank_data JSON
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Update bank account
    UPDATE bank_accounts SET
        bank_name = COALESCE((bank_data->>'bankName')::text, bank_name),
        account_number = COALESCE((bank_data->>'accountNumber')::text, account_number),
        ifsc_code = COALESCE((bank_data->>'ifscCode')::text, ifsc_code),
        account_holder_name = COALESCE((bank_data->>'accountHolderName')::text, account_holder_name),
        account_type = COALESCE((bank_data->>'accountType')::text, account_type),
        is_default = COALESCE((bank_data->>'isDefault')::boolean, is_default),
        updated_at = NOW()
    WHERE id = account_id_param AND user_id = user_id_param;

    -- If this account is set as default, unset others
    IF COALESCE((bank_data->>'isDefault')::boolean, false) THEN
        UPDATE bank_accounts
        SET is_default = false
        WHERE user_id = user_id_param AND id != account_id_param;
    END IF;

    SELECT json_build_object(
        'success', true,
        'message', 'Bank account updated successfully'
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete bank account
CREATE OR REPLACE FUNCTION delete_bank_account(
    user_id_param UUID,
    account_id_param UUID
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    remaining_count INTEGER;
BEGIN
    -- Soft delete the account
    UPDATE bank_accounts
    SET is_active = false, updated_at = NOW()
    WHERE id = account_id_param AND user_id = user_id_param;

    -- Check remaining active accounts
    SELECT COUNT(*) INTO remaining_count
    FROM bank_accounts
    WHERE user_id = user_id_param AND is_active = true;

    -- If this was the default account and there are others, make the first one default
    IF remaining_count > 0 THEN
        UPDATE bank_accounts
        SET is_default = true
        WHERE user_id = user_id_param 
        AND is_active = true 
        AND id = (
            SELECT id FROM bank_accounts 
            WHERE user_id = user_id_param AND is_active = true 
            ORDER BY created_at ASC 
            LIMIT 1
        );
    END IF;

    SELECT json_build_object(
        'success', true,
        'message', 'Bank account deleted successfully'
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create deposit request
CREATE OR REPLACE FUNCTION create_deposit_request(
    user_id_param UUID,
    deposit_data JSON
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    trading_account_id UUID;
    new_deposit_id UUID;
BEGIN
    -- Get trading account ID
    SELECT id INTO trading_account_id
    FROM trading_accounts
    WHERE user_id = user_id_param;

    IF trading_account_id IS NULL THEN
        SELECT json_build_object(
            'success', false,
            'message', 'Trading account not found'
        ) INTO result;
        RETURN result;
    END IF;

    new_deposit_id := gen_random_uuid();

    -- Insert deposit request
    INSERT INTO deposits (
        id, user_id, trading_account_id, bank_account_id,
        amount, method, status, utr, reference, remarks
    ) VALUES (
        new_deposit_id,
        user_id_param,
        trading_account_id,
        (deposit_data->>'bankAccountId')::uuid,
        (deposit_data->>'amount')::numeric,
        (deposit_data->>'method')::text,
        'PENDING',
        (deposit_data->>'utr')::text,
        (deposit_data->>'reference')::text,
        (deposit_data->>'remarks')::text
    );

    SELECT json_build_object(
        'success', true,
        'message', 'Deposit request created successfully',
        'depositId', new_deposit_id
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create withdrawal request
CREATE OR REPLACE FUNCTION create_withdrawal_request(
    user_id_param UUID,
    withdrawal_data JSON
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    trading_account_id UUID;
    available_balance NUMERIC;
    withdrawal_amount NUMERIC;
    new_withdrawal_id UUID;
BEGIN
    -- Get trading account ID and available balance
    SELECT ta.id, ta.available_margin INTO trading_account_id, available_balance
    FROM trading_accounts ta
    WHERE ta.user_id = user_id_param;

    IF trading_account_id IS NULL THEN
        SELECT json_build_object(
            'success', false,
            'message', 'Trading account not found'
        ) INTO result;
        RETURN result;
    END IF;

    withdrawal_amount := (withdrawal_data->>'amount')::numeric;

    -- Check if sufficient balance
    IF withdrawal_amount > available_balance THEN
        SELECT json_build_object(
            'success', false,
            'message', 'Insufficient balance for withdrawal'
        ) INTO result;
        RETURN result;
    END IF;

    new_withdrawal_id := gen_random_uuid();

    -- Insert withdrawal request
    INSERT INTO withdrawals (
        id, user_id, trading_account_id, bank_account_id,
        amount, status, reference, remarks, charges
    ) VALUES (
        new_withdrawal_id,
        user_id_param,
        trading_account_id,
        (withdrawal_data->>'bankAccountId')::uuid,
        withdrawal_amount,
        'PENDING',
        (withdrawal_data->>'reference')::text,
        (withdrawal_data->>'remarks')::text,
        COALESCE((withdrawal_data->>'charges')::numeric, 0)
    );

    SELECT json_build_object(
        'success', true,
        'message', 'Withdrawal request created successfully',
        'withdrawalId', new_withdrawal_id
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_console_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION add_bank_account(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION update_bank_account(UUID, UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_bank_account(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_deposit_request(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION create_withdrawal_request(UUID, JSON) TO authenticated;