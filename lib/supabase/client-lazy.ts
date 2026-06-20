import { createClient as createClientBase } from '@supabase/supabase-js';

/**
 * Lazy client creation that only initializes when called
 * Avoids build-time errors from missing env vars
 */
export function createLazyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClientBase(url, key);
}

/**
 * Safe version that returns null if env vars are missing
 */
export function createSafeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClientBase(url, key);
}
