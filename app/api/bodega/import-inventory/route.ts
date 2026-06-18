export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const costCenterId = formData.get('costCenterId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 1) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Parse CSV (use semicolon delimiter)
    const data: any[] = [];
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase());

    // Find column indices
    const codigoIdx = headers.findIndex(h => h.includes('código') || h.includes('codigo'));
    const familiaIdx = headers.findIndex(h => h.includes('familia'));
    const subFamiliaIdx = headers.findIndex(h => h.includes('sub-familia') || h.includes('subfamilia'));
    const equipoIdx = headers.findIndex(h => h.includes('equipo'));
    const productoIdx = headers.findIndex(h => h.includes('producto'));

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());

      if (values.length < 2 || !values[codigoIdx]) continue;

      const codigo = values[codigoIdx];
      const nombre = values[productoIdx] || values[familiaIdx] || '';

      if (!nombre) continue;

      data.push({
        codigo: codigo,
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
        { error: 'No valid data found in file' },
        { status: 400 }
      );
    }

    // Insert into bodega_inventory
    const { error: insertError, data: insertedData } = await supabase
      .from('bodega_inventory')
      .upsert(
        data.map(d => ({
          sku: d.sku,
          name: d.name,
          codigo: d.codigo,
          familia: d.familia,
          sub_familia: d.sub_familia,
          equipo: d.equipo,
          category: d.category,
          cost_center_id: d.cost_center_id,
          quantity: d.quantity,
          description: d.description,
          location: d.location,
          unit_cost: d.unit_cost,
          min_stock: d.min_stock,
          max_stock: d.max_stock,
        })),
        { onConflict: 'sku' }
      );

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${data.length} inventory items`,
      imported: data.length,
      costCenterId: costCenterId || null,
      sampleItems: data.slice(0, 3),
    });
  } catch (error) {
    console.error('[v0] Bodega inventory import error:', error);
    return NextResponse.json(
      { error: 'Failed to import inventory', details: String(error) },
      { status: 500 }
    );
  }
}
