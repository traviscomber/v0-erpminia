export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function canonicalCategory(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const normalized = normalizeHeader(raw).replace(/\s+/g, ' ');
  const aliases: Record<string, string> = {
    ferreteria: 'Ferretería',
    viveres: 'Víveres',
    neumatico: 'Neumático',
    electrico: 'Eléctrico',
    epp: 'EPP',
  };

  return aliases[normalized] || toTitleCase(raw);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get pagination parameters from query string
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  // Return the full list of distinct categories (across the whole table, not just one page)
  if (searchParams.get('categories') === 'true') {
    const categorySet = new Set<string>();
    let from = 0;
    const chunk = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('bodega_inventory')
        .select('category')
        .order('category')
        .range(from, from + chunk - 1);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data || data.length === 0) break;
      for (const row of data) {
        const categoryLabel = canonicalCategory(row.category);
        if (categoryLabel) categorySet.add(categoryLabel);
      }
      if (data.length < chunk) break;
      from += chunk;
    }
    const categories = Array.from(categorySet).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
    return NextResponse.json({ categories });
  }

  // Validate pagination parameters
  const validPageSize = Math.min(Math.max(pageSize, 10), 500);
  const validPage = Math.max(page, 0);
  const offset = validPage * validPageSize;

  // Build query with filters
  let query = supabase
    .from('bodega_inventory')
    .select('*', { count: 'exact' });

  // Apply search filter
  if (search) {
    query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%,category.ilike.%${search}%`);
  }

  // Apply category filter
  if (category) {
    query = query.eq('category', category);
  }

  // Apply pagination and sorting
  const { data, error, count } = await query
    .order('sku')
    .range(offset, offset + validPageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inventory: data || [],
    pagination: {
      page: validPage,
      pageSize: validPageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / validPageSize)
    }
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
