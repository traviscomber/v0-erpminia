export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { requestSiiSeed, SII_ENVIRONMENT } from '@/lib/sii/client';

export async function GET(request: NextRequest) {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  let organizationId: string | undefined;

  if (!isPreview) {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;
    organizationId = context.organizationId;
  }

  try {
    const result = await requestSiiSeed();
    return NextResponse.json({
      environment: SII_ENVIRONMENT,
      siiReachable: true,
      seedReceived: true,
      authenticated: false,
      ...(organizationId ? { organizationId } : {}),
      latencyMs: result.latencyMs,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const safeError = error instanceof Error && error.message.startsWith('SII_') ? error.message : 'SII_CONNECTION_FAILED';
    return NextResponse.json(
      {
        environment: SII_ENVIRONMENT,
        siiReachable: false,
        seedReceived: false,
        authenticated: false,
        ...(organizationId ? { organizationId } : {}),
        error: safeError,
        checkedAt: new Date().toISOString(),
      },
      { status: 502 },
    );
  }
}
