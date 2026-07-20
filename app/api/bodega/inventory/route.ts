export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { canonicalCategory } from '@/lib/bodega-normalization';

type BodegaInventoryRow = {
  id: string;
  sku?: string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  quantity?: number | null;
  quantity_available?: number | null;
  quantity_reserved?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  unit_cost?: number | null;
  location?: string | null;
  organization_id?: string | null;
  created_at?: string | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

  const validPageSize = Math.min(Math.max(pageSize, 10), 500);
  const validPage = Math.max(page, 0);
  const offset = validPage * validPageSize;

  if (searchParams.get('categories') === 'true') {
    const categorySet = new Set<string>();
    let from = 0;
    const chunk = 1000;

    while (true) {
      let query = supabase
        .from('bodega_inventory')
        .select('category')
        .order('category')
        .range(from, from + chunk - 1);

      if (orgId) {
        query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ categories: [], warning: error.message });
      }
      if (!data || data.length === 0) break;

      for (const row of data as Array<{ category?: string | null }>) {
        const label = String(row.category || '').trim();
        if (label) categorySet.add(canonicalCategory(label) || label);
      }

      if (data.length < chunk) break;
      from += chunk;
    }

    return NextResponse.json({
      categories: Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
    });
  }

  let query = supabase
    .from('bodega_inventory')
    .select(
      'id, sku, name, category, description, quantity, min_stock, max_stock, unit_cost, location, organization_id, created_at',
      { count: 'exact' },
    );

  if (orgId) {
    query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
  }
  if (search) query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`);
  if (category) query = query.ilike('category', `%${category}%`);

  const { data, error, count } = await query.order('sku').range(offset, offset + validPageSize - 1);

  if (error) {
    return NextResponse.json({
      inventory: [],
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total: 0,
        totalPages: 0,
      },
      warning: error.message,
    });
  }

  const inventory = (Array.isArray(data) ? (data as BodegaInventoryRow[]) : []).map((item) => ({
    id: item.id,
    sku: String(item.sku || ''),
    name: String(item.name || item.sku || ''),
    category: String(item.category || 'Otros'),
    quantity: toNumber(item.quantity),
    quantity_available: toNumber(item.quantity),
    quantity_reserved: 0,
    min_stock: toNumber(item.min_stock),
    max_stock: toNumber(item.max_stock),
    unit_cost: toNumber(item.unit_cost),
    description: String(item.description || item.location || ''),
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
