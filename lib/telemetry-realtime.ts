export function isTelemetryRealtimeEnabled() {
  if (process.env.NEXT_PUBLIC_TELEMETRY_REALTIME !== 'true') {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
