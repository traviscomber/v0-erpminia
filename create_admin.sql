-- 1. First, get juan@n3uralia.com's ID and roles
SELECT id, email FROM auth.users WHERE email = 'juan@n3uralia.com';

-- 2. Create the new user manually - we'll use Supabase admin API instead
