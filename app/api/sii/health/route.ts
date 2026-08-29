export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const SII_ENVIRONMENT = 'certification';
const SII_SEED_ENDPOINT = 'https://maullin.sii.cl/DTEWS/CrSeed.jws';
const SII_SEED_NAMESPACE = 'https://maullin.sii.cl/DTEWS/CrSeed.jws';
const TIMEOUT_MS = 10_000;

const SOAP_ENVELOPE = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Body>
    <ns1:getSeed soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:ns1="${SII_SEED_NAMESPACE}" />
  </soapenv:Body>
</soapenv:Envelope>`;

function seedWasReceived(body: string) {
  return /<SEMILLA>\s*\d+\s*<\/SEMILLA>/i.test(body) || /&lt;SEMILLA&gt;\s*\d+\s*&lt;\/SEMILLA&gt;/i.test(body);
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(SII_SEED_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'text/xml; charset=utf-8',
        soapaction: '""',
        'user-agent': 'MOTIL-SII-Connectivity/1.0',
      },
      body: SOAP_ENVELOPE,
      cache: 'no-store',
      signal: controller.signal,
    });

    const body = await response.text();
    const seedReceived = response.ok && seedWasReceived(body);

    return NextResponse.json(
      {
        environment: SII_ENVIRONMENT,
        siiReachable: response.ok,
        seedReceived,
        authenticated: false,
        organizationId: context.organizationId,
        upstreamStatus: response.status,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      { status: seedReceived ? 200 : 502 },
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json(
      {
        environment: SII_ENVIRONMENT,
        siiReachable: false,
        seedReceived: false,
        authenticated: false,
        organizationId: context.organizationId,
        error: timedOut ? 'SII_TIMEOUT' : 'SII_CONNECTION_FAILED',
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
