# Creating a Test User for MOTIL MVP

The app uses Supabase authentication. To create a test user, follow these steps:

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Authentication** → **Users**
3. Click **"+ Create a new user"**
4. Enter:
   - **Email**: `test@empresa.cl`
   - **Password**: `TestPass123!` (must be 8+ chars with uppercase, numbers, special chars)
   - Check **"Auto confirm user"**
5. Click **"Create user"**

## Option 2: Using SQL Editor

1. Go to **SQL Editor** in Supabase
2. Run this query:

```sql
-- Create test user in auth
INSERT INTO auth.users (
  instance_id, 
  id, 
  aud, 
  role, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at, 
  updated_at, 
  last_sign_in_at, 
  confirmation_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@empresa.cl',
  crypt('TestPass123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  now(),
  now(),
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Create profile for the user (run this after creating the auth user)
-- Replace USER_ID with the actual ID from the auth.users table
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  first_name,
  last_name,
  role,
  organization_id,
  status,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@empresa.cl' LIMIT 1),
  'test@empresa.cl',
  'Test User',
  'Test',
  'User',
  'admin',
  (SELECT id FROM organizations LIMIT 1), -- Use first organization or create one
  'active',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create user role
INSERT INTO public.user_roles (
  user_id,
  organization_id,
  role,
  created_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@empresa.cl' LIMIT 1),
  (SELECT id FROM organizations LIMIT 1),
  'admin',
  now()
) ON CONFLICT DO NOTHING;
```

## Option 3: Automatic Setup Script

Run this bash script if you have `supabase-cli` installed:

```bash
# Create test user with email
supabase auth users create --email test@empresa.cl --password TestPass123!
```

---

## Login Credentials

After creating the user, you can login with:

| Field | Value |
|-------|-------|
| **Email** | `test@empresa.cl` |
| **Password** | `TestPass123!` |
| **Role** | Admin |
| **Organization** | Default (first organization in DB) |

---

## Troubleshooting

### "Invalid credentials" error after creating the user

1. Verify the user was created: Go to **Authentication** → **Users** in Supabase
2. Check email is exactly `test@empresa.cl` (case-sensitive)
3. Verify organization exists: Go to **SQL Editor** and run:
   ```sql
   SELECT * FROM organizations LIMIT 1;
   ```
4. If no organizations exist, create one:
   ```sql
   INSERT INTO organizations (id, name, slug, created_at, updated_at)
   VALUES (gen_random_uuid(), 'Test Organization', 'test-org', now(), now());
   ```

### Still getting auth errors

1. Check browser console for detailed error message (F12 → Console tab)
2. Verify Supabase environment variables are set (Settings → Project Settings → API)
3. Try creating a new user with different email (e.g., `admin@test.com`)

---

## Next Steps After Login

Once logged in, you can:
1. View the Mantención dashboard
2. Create work orders
3. View HSE incidents
4. Check purchase orders
5. Export compliance reports

**Ready to use the MOTIL MVP!**
