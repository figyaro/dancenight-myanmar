-- Create Wallet and dtip Transaction System

-- 1. Create Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create dtip Transactions Table (Ledger)
CREATE TABLE IF NOT EXISTS public.dtip_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if purchase/system
    receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if payment to system/withdrawal
    amount BIGINT NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('purchase', 'tip', 'payment', 'refund', 'withdrawal')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference_type TEXT, -- e.g., 'post', 'reservation'
    reference_id UUID, -- id of the post or reservation
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dtip_transactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Wallets
CREATE POLICY "Users can view their own wallet" 
ON public.wallets FOR SELECT 
USING (auth.uid() = user_id);

-- 5. RLS Policies for Transactions
CREATE POLICY "Users can view their own sent transactions" 
ON public.dtip_transactions FOR SELECT 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can view their own received transactions" 
ON public.dtip_transactions FOR SELECT 
USING (auth.uid() = receiver_id);

-- 6. Atomic Transaction Function (RPC)
-- This function handles the transfer of coins between users
-- It ensures that either the entire transaction succeeds or fails (ACID)
CREATE OR REPLACE FUNCTION public.process_dtip_transaction(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount BIGINT,
    p_type TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_sender_balance BIGINT;
    v_new_sender_balance BIGINT;
    v_new_receiver_balance BIGINT;
    v_transaction_id UUID;
BEGIN
    -- 1. Validate simple conditions
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
    END IF;

    IF p_sender_id = p_receiver_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot send to self');
    END IF;

    -- 2. Lock sender wallet and check balance
    -- Purchase doesn't have a sender_id in dtip terms (system generates)
    IF p_sender_id IS NOT NULL THEN
        SELECT balance INTO v_sender_balance 
        FROM public.wallets 
        WHERE user_id = p_sender_id 
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Sender wallet not found');
        END IF;

        IF v_sender_balance < p_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
        END IF;

        -- Deduct from sender
        UPDATE public.wallets 
        SET balance = balance - p_amount, 
            updated_at = now()
        WHERE user_id = p_sender_id
        RETURNING balance INTO v_new_sender_balance;
    END IF;

    -- 3. Credit receiver wallet
    IF p_receiver_id IS NOT NULL THEN
        -- Ensure receiver has a wallet (create if missing, though triggers should handle)
        INSERT INTO public.wallets (user_id, balance)
        VALUES (p_receiver_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        UPDATE public.wallets 
        SET balance = balance + p_amount, 
            updated_at = now()
        WHERE user_id = p_receiver_id
        RETURNING balance INTO v_new_receiver_balance;
    END IF;

    -- 4. Record the transaction
    INSERT INTO public.dtip_transactions (
        sender_id, receiver_id, amount, type, reference_type, reference_id, metadata
    )
    VALUES (
        p_sender_id, p_receiver_id, p_amount, p_type, p_reference_type, p_reference_id, p_metadata
    )
    RETURNING id INTO v_transaction_id;

    RETURN jsonb_build_object(
        'success', true, 
        'transaction_id', v_transaction_id,
        'sender_new_balance', v_new_sender_balance,
        'receiver_new_balance', v_new_receiver_balance
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. Trigger to automatically create a wallet for every new user
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists before creating
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_wallet') THEN
        CREATE TRIGGER on_auth_user_created_wallet
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();
    END IF;
END $$;

-- 8. Backfill existing users (one-time)
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
