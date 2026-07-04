import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SilentWebSocket } from '@/lib/supabase/noop-websocket';

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    realtime: {
      transport: SilentWebSocket as unknown as typeof WebSocket,
    },
  });
}
