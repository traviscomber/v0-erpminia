export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../route';

export async function GET(request: NextRequest) {
  const target = new URL('/api/maintenance/senior-assistant', request.url);
  const probeRequest = new NextRequest(target, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({
      message: '¿Qué equipos requieren atención primero y por qué?',
      ephemeral: true,
    }),
  });

  const response = await POST(probeRequest);
  const payload = await response.json().catch(() => null);
  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    answer: typeof payload?.answer === 'string' ? payload.answer : null,
    model: payload?.model || null,
    responseId: payload?.responseId || null,
    error: payload?.error || null,
    code: payload?.code || null,
  }, { status: response.status });
}
