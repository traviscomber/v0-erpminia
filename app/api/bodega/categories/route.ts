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

  let query = supabase.from('bodega_inventory').select('category, quantity, min_stock');
  if (orgId) {
    query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ categories: [], warning: error.message });
  }

  const map = new Map<string, { count: number; low_stock: number; total_stock: number }>();

  for (const row of data ?? []) {
    const rawLabel = String((row as { category?: string | null }).category || '').trim();
    const label = canonicalCategory(rawLabel || 'Otros');
    const existing = map.get(label) ?? { count: 0, low_stock: 0, total_stock: 0 };
    const quantity = Number((row as { quantity?: number | null }).quantity || 0);
    const minStock = Number((row as { min_stock?: number | null }).min_stock || 0);
    existing.count += 1;
    existing.total_stock += quantity;
    if (quantity < minStock) {
      existing.low_stock += 1;
    }
    map.set(label, existing);
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
