export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// This API is disabled pending refactoring - use /api/documents/list instead
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Advanced search API is currently disabled. Use /api/documents/list instead.' },
    { status: 503 }
  );
}
