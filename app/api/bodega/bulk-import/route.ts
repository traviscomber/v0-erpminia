import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Falta configuración Supabase' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, data } = await request.json();

    if (type === 'cost-centers') {
      // Import cost centers
      const { error } = await supabase
        .from('cost_centers')
        .upsert(data, {
          onConflict: 'codigo_rec_elec'
        });

      if (error) {
        console.error('Error importing cost centers:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `${data.length} centros de costos importados`,
        count: data.length
      });
    }

    if (type === 'inventory') {
      // Import inventory
      const { error } = await supabase
        .from('bodega_inventory')
        .upsert(
          data.map((item: any) => ({
            ...item,
            sku: item.codigo,
            name: item.producto,
            category: item.familia,
            quantity: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
          {
            onConflict: 'sku'
          }
        );

      if (error) {
        console.error('Error importing inventory:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `${data.length} artículos importados`,
        count: data.length
      });
    }

    return NextResponse.json(
      { error: 'Tipo de importación inválido' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
