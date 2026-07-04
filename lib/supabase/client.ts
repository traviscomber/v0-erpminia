import { createBrowserClient } from '@supabase/ssr';
import { isTelemetryRealtimeEnabled } from '@/lib/telemetry-realtime';
import { SilentWebSocket } from '@/lib/supabase/noop-websocket';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  if (!isTelemetryRealtimeEnabled()) {
    return createBrowserClient(supabaseUrl, supabaseKey, {
      realtime: {
        transport: SilentWebSocket as unknown as typeof WebSocket,
      },
    });
  }

  if (typeof WebSocket === 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseKey);
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    realtime: {
      transport: WebSocket,
    },
  });
}
