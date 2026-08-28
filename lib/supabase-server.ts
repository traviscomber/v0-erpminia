import { createClient } from '@supabase/supabase-js';
import { SilentWebSocket } from '@/lib/supabase/noop-websocket';

export function getSupabaseServerClient(applicationUserId?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Faltan variables de entorno de Supabase');
  }

  return createClient(url, key, {
    global: applicationUserId
      ? { headers: { 'x-application-user-id': applicationUserId } }
      : undefined,
    realtime: {
      transport: SilentWebSocket as unknown as typeof WebSocket,
    },
  });
}
