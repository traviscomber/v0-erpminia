-- Supabase Auth is the canonical authentication source for Supabase-authenticated users.
-- Legacy/custom-cookie profiles may still retain password_hash, but it must not be required
-- for an identity whose credential is owned by auth.users.
alter table public.profiles
  alter column password_hash drop not null;
