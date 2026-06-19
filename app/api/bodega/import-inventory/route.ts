export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Falta la configuración de Supabase' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const costCenterId = formData.get('costCenterId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'El archivo está vacío' },
        { status: 400 }
      );
    }

    const data: Array<Record<string, unknown>> = [];
    const headers = lines[0].split(';').map((header) => header.trim().toLowerCase());

    const codigoIdx = headers.findIndex((header) => header.includes('código') || header.includes('codigo'));
    const familiaIdx = headers.findIndex((header) => header.includes('familia'));
    const subFamiliaIdx = headers.findIndex((header) => header.includes('sub-familia') || header.includes('subfamilia'));
    const equipoIdx = headers.findIndex((header) => header.includes('equipo'));
    const productoIdx = headers.findIndex((header) => header.includes('producto'));

    for (let i = 1; i < lines.length; i += 1) {
      const values = lines[i].split(';').map((value) => value.trim());

      if (values.length < 2 || !values[codigoIdx]) continue;

      const codigo = values[codigoIdx];
      const nombre = values[productoIdx] || values[familiaIdx] || '';

      if (!nombre) continue;

      data.push({
        codigo,
        name: nombre,
        sku: codigo,
        familia: values[familiaIdx] || '',
        sub_familia: values[subFamiliaIdx] || '',
        equipo: values[equipoIdx] || '',
        category: values[familiaIdx] || 'General',
        cost_center_id: costCenterId || null,
        quantity: 0,
        description: `${values[familiaIdx] || ''} ${values[subFamiliaIdx] || ''} ${values[equipoIdx] || ''}`.trim(),
        location: '',
        unit_cost: 0,
        min_stock: 5,
        max_stock: 500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron datos válidos en el archivo' },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from('bodega_inventory')
      .upsert(
        data.map((item) => ({
          sku: item.sku,
          name: item.name,
          codigo: item.codigo,
          familia: item.familia,
          sub_familia: item.sub_familia,
          equipo: item.equipo,
          category: item.category,
          cost_center_id: item.cost_center_id,
          quantity: item.quantity,
          description: item.description,
          location: item.location,
          unit_cost: item.unit_cost,
          min_stock: item.min_stock,
          max_stock: item.max_stock,
        })),
        { onConflict: 'sku' }
      );

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: `Se importaron correctamente ${data.length} ítems de inventario`,
      imported: data.length,
      costCenterId: costCenterId || null,
      sampleItems: data.slice(0, 3),
    });
  } catch (error) {
    console.error('[v0] Bodega inventory import error:', error);
    return NextResponse.json(
      { error: 'No se pudo importar el inventario', details: String(error) },
      { status: 500 }
    );
  }
}
