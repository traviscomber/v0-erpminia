export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { canonicalCategory } from '@/lib/bodega-normalization';

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const orgId = auth.organizationId;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  if (searchParams.get('categories') === 'true') {
    const categorySet = new Set<string>();
    let from = 0;
    const chunk = 1000;

    while (true) {
      let q = supabase
        .from('warehouse_stock')
        .select('part_code')
        .order('part_code')
        .range(from, from + chunk - 1);
      if (orgId) q = q.eq('organization_id', orgId);

      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data || data.length === 0) break;

      for (const row of data) {
        const label = canonicalCategory(row.part_code);
        if (label) categorySet.add(label);
      }

      if (data.length < chunk) break;
      from += chunk;
    }

    const categories = Array.from(categorySet).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
    return NextResponse.json({ categories });
  }

  const validPageSize = Math.min(Math.max(pageSize, 10), 500);
  const validPage = Math.max(page, 0);
  const offset = validPage * validPageSize;

  let query = supabase
    .from('warehouse_stock')
    .select(
      'id, part_code, quantity, min_stock, max_stock, unit_cost, batch_number, warehouse_location, organization_id, created_at',
      { count: 'exact' },
    );

  if (orgId) query = query.eq('organization_id', orgId);
  if (search) query = query.or(`part_code.ilike.%${search}%,batch_number.ilike.%${search}%`);
  if (category) query = query.ilike('part_code', `%${category}%`);

  const { data, error, count } = await query
    .order('part_code')
    .range(offset, offset + validPageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map warehouse_stock → InventoryItem shape expected by the UI hook
  const inventory = (data || []).map((item: any) => ({
    id: item.id,
    sku: item.part_code,
    name: item.batch_number || item.part_code,
    category: canonicalCategory(item.part_code) || item.part_code,
    quantity: item.quantity ?? 0,
    min_stock: item.min_stock ?? 0,
    max_stock: item.max_stock ?? 0,
    unit_cost: item.unit_cost ?? 0,
    description: item.warehouse_location || '',
  }));

  return NextResponse.json({
    inventory,
    pagination: {
      page: validPage,
      pageSize: validPageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / validPageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const body = await request.json();
  const { sku, name, category, quantity, unit_cost } = body;

  const { data, error } = await supabase
    .from('bodega_inventory')
    .insert({
      sku,
      name,
      category: canonicalCategory(category),
      quantity,
      unit_cost,
      ...(auth.organizationId ? { organization_id: auth.organizationId } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
