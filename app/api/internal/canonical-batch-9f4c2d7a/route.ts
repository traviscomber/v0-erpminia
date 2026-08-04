export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'node:zlib';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const RPC_BY_KIND: Record<string, string> = {
  purchase: 'import_canonical_purchase_lines',
  costs: 'import_canonical_asset_costs',
  products: 'import_canonical_products',
  inventory: 'import_canonical_inventory',
};

export async function POST(request: NextRequest) {
  const kind = request.headers.get('x-import-kind') || '';
  const rpc = RPC_BY_KIND[kind];
  if (!rpc) return NextResponse.json({ error: 'Invalid import kind' }, { status: 400 });

  const body = Buffer.from(await request.arrayBuffer());
  if (body.length === 0 || body.length > 4_000_000) {
    return NextResponse.json({ error: 'Invalid payload size' }, { status: 413 });
  }

  try {
    const decoded = request.headers.get('content-encoding') === 'gzip' ? gunzipSync(body) : body;
    const payload = JSON.parse(decoded.toString('utf8'));
    if (!Array.isArray(payload) || payload.length === 0 || payload.length > 3_000) {
      return NextResponse.json({ error: 'Invalid batch' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc(rpc, { payload });
    if (error) throw error;

    return NextResponse.json({ kind, processed: Number(data || 0) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
