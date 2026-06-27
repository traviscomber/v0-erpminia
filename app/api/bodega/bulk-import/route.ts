import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Falta configuracion Supabase' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await request.json().catch(() => ({}));
    const { type, data } = body as { type?: string; data?: any[] };

    if (type !== 'inventory') {
      return NextResponse.json(
        { error: 'Tipo de importacion no especificado. Use type: "inventory"' },
        { status: 400 },
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No hay datos para importar', count: 0 }, { status: 400 });
    }

    const mappedData = data
      .map((item: any) => ({
        sku: item.codigo || '',
        name: item.producto || '',
        category: item.familia || '',
        description: `${item.sub_familia || ''}${item.equipo ? ' - ' + item.equipo : ''}`.trim() || item.producto || '',
        quantity: 0,
        unit_cost: 0,
        min_stock: 0,
        max_stock: 0,
        location: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      .filter((item: any) => item.sku && item.name);

    if (mappedData.length === 0) {
      return NextResponse.json({ error: 'No se encontraron registros validos para importar', count: 0 }, { status: 400 });
    }

    const { error } = await supabase
      .from('bodega_inventory')
      .upsert(mappedData, {
        onConflict: 'sku',
      });

    if (error) {
      console.error('Error importing inventory:', error);
      return NextResponse.json({ error: error.message, count: 0 }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${mappedData.length} articulos importados exitosamente a Supabase`,
      count: mappedData.length,
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al importar datos' },
      { status: 500 },
    );
  }
}
