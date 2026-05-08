-- Temporarily disable RLS on contracts table
-- This allows public read access during development

-- Step 1: Disable RLS
ALTER TABLE public.contracts DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'contracts';

-- You can re-enable it later with:
-- ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
