-- Add last_login_at column to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Function to sync last login from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_last_login_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_last_login_sync();

-- Initial sync for existing users
UPDATE public.users u
SET last_login_at = au.last_sign_in_at
FROM auth.users au
WHERE u.id = au.id;
