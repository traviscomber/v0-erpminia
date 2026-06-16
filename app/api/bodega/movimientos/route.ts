export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { sku, tipo, cantidad, razon, location_from, location_to } = await request.json();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: inventory, error: invError } = await supabase
    .from('bodega_inventory')
    .select('*')
    .eq('sku', sku)
    .single();

  if (invError || !inventory) return NextResponse.json({ error: 'SKU not found' }, { status: 404 });

  let newQuantity = inventory.quantity;
  if (tipo === 'entrada') newQuantity += cantidad;
  else if (tipo === 'salida') newQuantity = Math.max(0, inventory.quantity - cantidad);

  // Update inventory
  const { data: updated, error: updateError } = await supabase
    .from('bodega_inventory')
    .update({
      quantity: newQuantity,
      location: location_to || inventory.location,
    })
    .eq('sku', sku)
    .select();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Record movement
  const { data: movement, error: moveError } = await supabase
    .from('bodega_movements')
    .insert({
      sku,
      movement_type: tipo,
      quantity: cantidad,
      reason: razon,
      performed_by: user.id,
    })
    .select();

  if (moveError) return NextResponse.json({ error: moveError.message }, { status: 500 });

  return NextResponse.json({
    inventory: updated?.[0],
    movement: movement?.[0],
    alert_reorder: newQuantity <= inventory.min_stock,
  }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku');
  const limit = parseInt(searchParams.get('limit') || '20');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!sku) return NextResponse.json({ error: 'SKU required' }, { status: 400 });

  const { data, error } = await supabase
    .from('bodega_movements')
    .select('*')
    .eq('sku', sku)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ movements: data || [] });
}
