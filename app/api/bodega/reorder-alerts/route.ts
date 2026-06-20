export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('bodega_inventory')
    .select('id, sku, name, quantity, min_stock, category')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const alerts = (data || [])
    .filter((item) => (item.quantity || 0) <= (item.min_stock || 0))
    .map((item) => ({
      ...item,
      reorder_qty: Math.max(0, (item.min_stock || 0) * 2 - (item.quantity || 0)),
      days_until_stockout: item.quantity > 0 ? Math.ceil(item.quantity / 1) : 0,
    }));

  return NextResponse.json({
    items_below_min_stock: alerts,
    total_alerts: alerts.length,
  });
}
