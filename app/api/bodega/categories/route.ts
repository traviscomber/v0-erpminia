export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { canonicalCategory, getCategoryColor } from '@/lib/bodega-normalization';

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const orgId = auth.organizationId;

  // Fetch all part_codes with stock info to compute category summaries server-side
  let query = supabase
    .from('warehouse_stock')
    .select('part_code, quantity_on_hand, reorder_level');

  if (orgId) query = query.eq('organization_id', orgId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ categories: [], warning: error.message });
  }

  // Aggregate by canonical category
  const map = new Map<string, { count: number; low_stock: number; total_stock: number }>();

  for (const row of data ?? []) {
    const cat = canonicalCategory(row.part_code);
    const existing = map.get(cat) ?? { count: 0, low_stock: 0, total_stock: 0 };
    existing.count += 1;
    existing.total_stock += Number(row.quantity_on_hand ?? 0);
    if (Number(row.quantity_on_hand ?? 0) < Number(row.reorder_level ?? 0)) {
      existing.low_stock += 1;
    }
    map.set(cat, existing);
  }

  const categories = Array.from(map.entries())
    .map(([label, stats]) => ({
      label,
      color: getCategoryColor(label),
      count: stats.count,
      total_stock: stats.total_stock,
      low_stock: stats.low_stock,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ categories });
}
