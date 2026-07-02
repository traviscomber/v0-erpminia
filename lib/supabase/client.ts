import { createBrowserClient } from '@supabase/ssr';
import { isTelemetryRealtimeEnabled } from '@/lib/telemetry-realtime';

class NoopWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readonly readyState = NoopWebSocket.CLOSED;
  readonly url = '';
  readonly protocol = '';

  binaryType?: BinaryType;
  bufferedAmount = 0;
  extensions = '';
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;

  constructor(_url: string | URL, _protocols?: string | string[]) {}

  close() {}

  send(_data: string | ArrayBufferLike | Blob | ArrayBufferView) {}

  addEventListener() {}

  removeEventListener() {}
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    realtime: {
      transport: (isTelemetryRealtimeEnabled() ? WebSocket : NoopWebSocket) as unknown as typeof WebSocket,
    },
  });
}
