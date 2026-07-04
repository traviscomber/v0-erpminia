export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

type TelemetryHealthResponse = {
  ok: boolean;
  status: 'ok' | 'degraded' | 'error';
  configured: boolean;
  endpoint: string;
  ingest_endpoint: string;
  required_header: string;
  message: string;
};

function pickToken(request: NextRequest) {
  return (
    request.headers.get('x-telemetry-token') ||
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    ''
  );
}

export async function GET(request: NextRequest) {
  const configured = Boolean(process.env.TELEMETRY_INGEST_TOKEN);
  const response: TelemetryHealthResponse = {
    ok: true,
    status: 'ok',
    configured,
    endpoint: '/api/telemetry/health',
    ingest_endpoint: '/api/telemetry/ingest',
    required_header: 'x-telemetry-token',
    message: configured
      ? 'Telemetry LAN health check available'
      : 'Telemetry ingest token not configured',
  };

  if (!configured) {
    return NextResponse.json(
      {
        ...response,
        ok: false,
        status: 'degraded',
      },
      { status: 503 }
    );
  }

  const token = pickToken(request);
  if (token && token !== process.env.TELEMETRY_INGEST_TOKEN) {
    return NextResponse.json(
      {
        ...response,
        ok: false,
        status: 'error',
        message: 'Invalid telemetry token',
      },
      { status: 401 }
    );
  }

  return NextResponse.json(response);
}
