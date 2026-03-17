-- Seed 5 Sample Female Users with Idempotency
-- This script inserts into both auth.users and public.users
-- Password for all users will be 'password123' (hashed)

DO $$
DECLARE
    u_id UUID;
    user_email TEXT;
    user_nickname TEXT;
    user_bio TEXT;
    emails TEXT[] := ARRAY['hnin@example.com', 'su@example.com', 'may@example.com', 'thazin@example.com', 'ei@example.com'];
    nicknames TEXT[] := ARRAY['Hnin', 'Su', 'May', 'Thazin', 'Ei'];
    bios TEXT[] := ARRAY['Hello! I love dancing.', 'Enjoying the music.', 'Professional dancer.', 'Let''s move!', 'Dance is life.'];
BEGIN
    FOR i IN 1..5 LOOP
        user_email := emails[i];
        user_nickname := nicknames[i];
        user_bio := bios[i];

        -- Check if user already exists in auth.users
        SELECT id INTO u_id FROM auth.users WHERE email = user_email;

        IF u_id IS NULL THEN
            u_id := gen_random_uuid();
            -- Insert into auth.users
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, recovery_token, email_change_token_new, instance_id)
            VALUES (u_id, user_email, crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('nickname', user_nickname), now(), now(), 'authenticated', '', '', '', '00000000-0000-0000-0000-000000000000');
        END IF;

        -- Insert into public.users (using ON CONFLICT in case a trigger already handled it)
        INSERT INTO public.users (id, nickname, email, role, gender, nationality, language, bio)
        VALUES (u_id, user_nickname, user_email, 'user', 'female', 'Myanmar', 'my', user_bio)
        ON CONFLICT (id) DO UPDATE SET
            nickname = EXCLUDED.nickname,
            bio = EXCLUDED.bio,
            gender = EXCLUDED.gender;

    END LOOP;
END $$;
