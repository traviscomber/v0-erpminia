import { createBrowserClient } from '@supabase/ssr';
import { isTelemetryRealtimeEnabled } from '@/lib/telemetry-realtime';

class SilentWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readyState = SilentWebSocket.OPEN;
  url: string;
  protocol = '';
  bufferedAmount = 0;
  binaryType: BinaryType = 'blob';
  extensions = '';
  skipHeartbeat = true;

  onopen: ((ev: Event) => any) | null = null;
  onmessage: ((ev: MessageEvent) => any) | null = null;
  onclose: ((ev: CloseEvent) => any) | null = null;
  onerror: ((ev: Event) => any) | null = null;

  private listeners = new Map<string, Set<EventListener>>();

  constructor(url: string | URL) {
    this.url = String(url);

    queueMicrotask(() => {
      if (this.readyState !== SilentWebSocket.CLOSED) {
        this.onopen?.(new Event('open') as Event);
        this.dispatch('open', new Event('open'));
      }
    });
  }

  close(): void {
    if (this.readyState === SilentWebSocket.CLOSED) return;
    this.readyState = SilentWebSocket.CLOSING;
    this.readyState = SilentWebSocket.CLOSED;
    const event = new Event('close') as CloseEvent;
    this.onclose?.(event);
    this.dispatch('close', event);
  }

  send(): void {
    // Intentionally silent: telemetry and auth continue through HTTP APIs.
  }

  addEventListener(type: string, listener: EventListener): void {
    const bucket = this.listeners.get(type) ?? new Set<EventListener>();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    this.dispatch(event.type, event);
    return true;
  }

  private dispatch(type: string, event: Event) {
    this.listeners.get(type)?.forEach((listener) => listener.call(this, event));
  }
}

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
