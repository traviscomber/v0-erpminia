export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';

const PASSES_PER_RUN = 4;
const PASS_TIMEOUT_MS = 60_000;

type ImportPassResult = {
  ok?: boolean;
  processed?: number;
  imported?: number;
  autoApproved?: number;
  failed?: number;
  message?: string;
  [key: string]: unknown;
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const passes: ImportPassResult[] = [];
  let processed = 0;
  let imported = 0;
  let autoApproved = 0;
  let failed = 0;

  for (let pass = 0; pass < PASSES_PER_RUN; pass += 1) {
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/cron/product-media-web-import`, {
        method: 'GET',
        headers: { authorization },
        cache: 'no-store',
        signal: AbortSignal.timeout(PASS_TIMEOUT_MS),
      });

      const body = (await response.json().catch(() => ({}))) as ImportPassResult;
      passes.push({ ...body, httpStatus: response.status, pass: pass + 1 });

      if (!response.ok) {
        failed += 1;
        break;
      }

      const passProcessed = Number(body.processed || 0);
      processed += passProcessed;
      imported += Number(body.imported || 0);
      autoApproved += Number(body.autoApproved || 0);
      failed += Number(body.failed || 0);

      if (passProcessed === 0) break;
    } catch (error) {
      failed += 1;
      passes.push({
        ok: false,
        pass: pass + 1,
        error: error instanceof Error ? error.message : String(error),
      });
      break;
    }
  }

  return NextResponse.json({
    ok: true,
    passesRun: passes.length,
    maxPasses: PASSES_PER_RUN,
    processed,
    imported,
    autoApproved,
    failed,
    passes,
  });
}
