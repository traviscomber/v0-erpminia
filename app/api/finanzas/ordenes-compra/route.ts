import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    let query = supabase
      .from('finanzas_ordenes_compra')
      .select(`
        *,
        lineas:finanzas_ordenes_compra_lineas(*)
      `);

    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query.order('fecha_emision', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ordenes: data || [] });
  } catch (error) {
    console.error('[v0] Error fetching OC:', error);
    return NextResponse.json({ error: 'Failed to fetch OC' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const numero_oc = `OC-${Date.now()}`;

    const { data, error } = await supabase
      .from('finanzas_ordenes_compra')
      .insert([
        {
          numero_oc,
          proveedor: body.proveedor,
          descripcion: body.descripcion,
          monto_total: body.monto_total,
          estado: 'emitida',
        },
      ])
      .select();

    if (error) throw error;

    // Insert line items if provided
    if (body.lineas && data?.[0]) {
      await supabase
        .from('finanzas_ordenes_compra_lineas')
        .insert(
          body.lineas.map((line: any) => ({
            oc_id: data[0].id,
            sku: line.sku,
            descripcion: line.descripcion,
            cantidad: line.cantidad,
            precio_unitario: line.precio_unitario,
          }))
        );
    }

    return NextResponse.json({ oc: data?.[0] }, { status: 201 });
  } catch (error) {
    console.error('[v0] Error creating OC:', error);
    return NextResponse.json({ error: 'Failed to create OC' }, { status: 500 });
  }
}
