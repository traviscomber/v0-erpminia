export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { canonicalCategory } from '@/lib/bodega-normalization';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);

  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

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
      const { data, error } = await supabase
        .from('warehouse_stock')
        .select('part_code')
        .eq('organization_id', auth.organizationId)
        .order('part_code')
        .range(from, from + chunk - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        const categoryLabel = canonicalCategory(row.part_code);
        if (categoryLabel) categorySet.add(categoryLabel);
      }

      if (data.length < chunk) break;
      from += chunk;
    }

    const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return NextResponse.json({ categories });
  }

  const validPageSize = Math.min(Math.max(pageSize, 10), 500);
  const validPage = Math.max(page, 0);
  const offset = validPage * validPageSize;

  let query = supabase
    .from('warehouse_stock')
    .select(
      'id, part_code, quantity, min_stock, max_stock, unit_cost, batch_number, warehouse_location, organization_id, created_at',
      { count: 'exact' }
    )
    .eq('organization_id', auth.organizationId);

  if (search) {
    query = query.or(`part_code.ilike.%${search}%,batch_number.ilike.%${search}%`);
  }

  const { data, error, count } = await query.order('part_code').range(offset, offset + validPageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform warehouse_stock to bodega_inventory format for UI compatibility
  const inventory = (data || []).map((item: any) => ({
    id: item.id,
    sku: item.part_code,
    name: item.batch_number || 'Stock',
    category: item.part_code, // Use part_code as category
    quantity: item.quantity,
    min_stock: item.min_stock,
    max_stock: item.max_stock,
    unit_cost: item.unit_cost,
    description: item.warehouse_location,
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
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);

  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

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
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
