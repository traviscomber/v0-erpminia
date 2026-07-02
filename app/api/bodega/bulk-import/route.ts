import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type BulkImportType = 'inventory';

type InventoryImportRow = {
  codigo?: string;
  producto?: string;
  familia?: string;
  sub_familia?: string;
  equipo?: string;
};

type BulkImportBody = {
  type?: BulkImportType | string;
  data?: InventoryImportRow[];
};

type BodegaInventoryUpsertRow = {
  sku: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  unit_cost: number;
  min_stock: number;
  max_stock: number;
  location: string;
  created_at: string;
  updated_at: string;
};

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

    const body = (await request.json().catch(() => ({}))) as BulkImportBody;
    const { type, data } = body;

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
      .map((item): BodegaInventoryUpsertRow => ({
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
      .filter((item) => item.sku && item.name);

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
  } catch (error: unknown) {
    console.error('Bulk import error:', error);
    const message = error instanceof Error ? error.message : 'Error al importar datos';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
