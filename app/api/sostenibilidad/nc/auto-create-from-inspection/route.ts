import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/sostenibilidad/nc/auto-create-from-inspection
// Auto-genera No-Conformidades desde hallazgos de inspección
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { inspection_id, inspection_type, hallazgos } = body;

    if (!inspection_id || !hallazgos || hallazgos.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: inspection_id, hallazgos' },
        { status: 400 }
      );
    }

    const createdNCs = [];

    for (const hallazgo of hallazgos) {
      // Generar número NC auto-incrementado
      const { data: lastNC } = await supabase
        .from('sostenibilidad_nonconformances')
        .select('nc_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastNumber = lastNC?.nc_number ? parseInt(lastNC.nc_number.split('-')[2]) : 0;
      const newNCNumber = `NC-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(4, '0')}`;

      // Determinar severidad basada en hallazgo
      const severity = hallazgo.severity || 'media';

      const { data: createdNC, error: ncError } = await supabase
        .from('sostenibilidad_nonconformances')
        .insert([
          {
            nc_number: newNCNumber,
            title: hallazgo.titulo || `Hallazgo de inspección ${inspection_type}`,
            description: hallazgo.descripcion || hallazgo.detalle,
            severity,
            category: hallazgo.categoria || 'procedimiento',
            source: `inspección_${inspection_type}`,
            status: 'abierta',
            discovered_date: new Date().toLocaleDateString('en-CA'),
            reported_by: hallazgo.reportado_por || 'sistema',
            target_closure_date: calculateTargetClosureDate(severity),
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (ncError) {
        console.error('Error creating NC:', ncError);
        continue;
      }

      createdNCs.push(createdNC);

      // Registrar detalles de hallazgo
      await supabase.from('sostenibilidad_nc_details').insert([
        {
          nc_id: createdNC.id,
          detail_type: 'hallazgo_inspeccion',
          description: hallazgo.descripcion || hallazgo.detalle,
          file_url: hallazgo.evidencia_url || null,
          uploaded_at: new Date().toISOString(),
        },
      ]);

      // Crear evento en calendario
      await supabase.from('calendario_eventos_sostenibilidad').insert([
        {
          titulo: `No-Conformidad: ${newNCNumber}`,
          descripcion: hallazgo.descripcion || hallazgo.detalle,
          tipo_evento: 'no_conformidad',
          fecha_inicio: new Date().toISOString(),
          fecha_fin: new Date(calculateTargetClosureDate(severity)).toISOString(),
          estado: 'activa',
          relacionado_modulo_tipo: 'no_conformidad',
          relacionado_modulo_id: createdNC.id,
          created_at: new Date().toISOString(),
        },
      ]);

      // Log event
      await supabase.from('event_log').insert([
        {
          source_module: 'sostenibilidad',
          source_table: 'sostenibilidad_nonconformances',
          source_id: createdNC.id,
          event_type: 'nc_auto_created_from_inspection',
          payload: { inspection_id, hallazgo, nc: createdNC },
          status: 'processed',
        },
      ]);
    }

    return NextResponse.json(
      {
        success: true,
        created_ncs: createdNCs,
        count: createdNCs.length,
        message: `${createdNCs.length} No-Conformidades generadas automáticamente`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error auto-creating NCs:', error);
    return NextResponse.json(
      { error: 'No se pudieron crear automticamente las no conformidades' },
      { status: 500 }
    );
  }
}

// Helper function para calcular fecha de cierre basada en severidad
function calculateTargetClosureDate(severity: string): string {
  const date = new Date();
  switch (severity.toLowerCase()) {
    case 'crítica':
      date.setDate(date.getDate() + 7); // 7 días
      break;
    case 'alta':
      date.setDate(date.getDate() + 14); // 14 días
      break;
    case 'media':
      date.setDate(date.getDate() + 30); // 30 días
      break;
    case 'baja':
      date.setDate(date.getDate() + 60); // 60 días
      break;
    default:
      date.setDate(date.getDate() + 30);
  }
  return date.toLocaleDateString('en-CA');
}
