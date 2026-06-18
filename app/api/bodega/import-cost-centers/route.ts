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

    // Parse CSV
    const data: any[] = [];
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase());

    // Find column indices
    const codigoIdx = headers.findIndex(h => h.includes('código') || h.includes('codigo'));
    const nombreIdx = headers.findIndex(h => h.includes('nombre'));
    const rutaIdx = headers.findIndex(h => h.includes('ruta'));
    const creadoPorIdx = headers.findIndex(h => h.includes('creador'));
    const fechaCreacionIdx = headers.findIndex(h => h.includes('fecha de creación'));
    const notasIdx = headers.findIndex(h => h.includes('notas'));

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());

      if (values.length < 2 || !values[codigoIdx]) continue;

      const codigo = values[codigoIdx];
      const nombre = values[nombreIdx] || '';
      const rutaCompleta = values[rutaIdx] || '';

      data.push({
        codigo_rec_elec: codigo,
        nombre,
        ruta_completa: rutaCompleta,
        creador_por: values[creadoPorIdx] || '',
        fecha_creacion: values[fechaCreacionIdx] || new Date().toISOString(),
        notas: values[notasIdx] || '',
        parent_id: null, // Will be set after initial insert
        nivel: rutaCompleta.split(' > ').length,
      });
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in file' },
        { status: 400 }
      );
    }

    // Insert root centers first (those with level 1)
    const rootCenters = data.filter(d => d.nivel === 1);
    const childCenters = data.filter(d => d.nivel > 1);

    // Insert root centers
    if (rootCenters.length > 0) {
      const { error: rootError } = await supabase
        .from('cost_centers')
        .upsert(
          rootCenters.map(d => ({
            codigo_rec_elec: d.codigo_rec_elec,
            nombre: d.nombre,
            ruta_completa: d.ruta_completa,
            nivel: 1,
            parent_id: null,
            creador_por: d.creador_por,
            fecha_creacion: d.fecha_creacion,
            notas: d.notas,
          })),
          { onConflict: 'codigo_rec_elec' }
        );

      if (rootError) throw rootError;
    }

    // Insert child centers with parent references
    if (childCenters.length > 0) {
      // For each child, find parent from ruta_completa
      const processedChildren = await Promise.all(
        childCenters.map(async (child) => {
          const rutaParts = child.ruta_completa.split(' > ');
          let parentId = null;

          if (rutaParts.length > 1) {
            // Get parent codigo from ruta
            const parentRuta = rutaParts.slice(0, -1).join(' > ');
            
            // Find parent in already inserted data
            const parentCenter = data.find(d => d.ruta_completa === parentRuta);
            
            if (parentCenter) {
              // Query database for parent
              const { data: parentData } = await supabase
                .from('cost_centers')
                .select('id')
                .eq('codigo_rec_elec', parentCenter.codigo_rec_elec)
                .single();

              parentId = parentData?.id || null;
            }
          }

          return {
            codigo_rec_elec: child.codigo_rec_elec,
            nombre: child.nombre,
            ruta_completa: child.ruta_completa,
            nivel: child.nivel,
            parent_id: parentId,
            creador_por: child.creador_por,
            fecha_creacion: child.fecha_creacion,
            notas: child.notas,
          };
        })
      );

      const { error: childError } = await supabase
        .from('cost_centers')
        .upsert(processedChildren, { onConflict: 'codigo_rec_elec' });

      if (childError) throw childError;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${data.length} cost centers`,
      imported: data.length,
      roots: rootCenters.length,
      children: childCenters.length,
    });
  } catch (error) {
    console.error('[v0] Cost centers import error:', error);
    return NextResponse.json(
      { error: 'Failed to import cost centers', details: String(error) },
      { status: 500 }
    );
  }
}
