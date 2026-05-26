import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { categoria: string } }
) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
    }

    // Fetch all approval flows
    const response = await fetch(`${url}/rest/v1/flujo_aprobacion_documentos_sostenibilidad?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    const allDocs = await response.json();

    if (!Array.isArray(allDocs)) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 });
    }

    // Map categories to document types
    const categoryMap: Record<string, string[]> = {
      seguridad: ['MSDS', 'Seguridad', 'Protocolo', 'Auditoría'],
      ambiental: ['Ambiental', 'Residuos', 'Impacto'],
      operacional: ['Procedimiento', 'Instructivo', 'Plan'],
      laboral: ['RIOHS', 'Capacitación', 'Permiso'],
    };

    const keywords = categoryMap[params.categoria] || [];

    // Filter documents by category
    const documents = allDocs
      .filter((doc: any) => {
        const name = (doc.documento_nombre || '').toLowerCase();
        return keywords.some((kw) => name.includes(kw.toLowerCase()));
      })
      .map((doc: any) => ({
        id: doc.id,
        documentId: doc.documento_id,
        nombre: doc.documento_nombre,
        version: doc.version,
        estado: doc.estado,
        createdBy: doc.creador_nombre,
        validador1: {
          nombre: doc.validador1_nombre,
          rol: doc.validador1_rol,
          accion: doc.validador1_accion,
        },
        validador2: {
          nombre: doc.validador2_nombre,
          rol: doc.validador2_rol,
          accion: doc.validador2_accion,
        },
        activo: doc.activo,
      }));

    // Separate by approval status
    const aprobados = documents.filter((d: any) => d.estado === 'aprobado');
    const pendientes = documents.filter(
      (d: any) =>
        d.estado === 'pendiente_validador1' || d.estado === 'pendiente_validador2'
    );
    const rechazados = documents.filter((d: any) => d.estado === 'rechazado');

    return NextResponse.json({
      categoria: params.categoria,
      stats: {
        total: documents.length,
        aprobados: aprobados.length,
        pendientes: pendientes.length,
        rechazados: rechazados.length,
      },
      documents: {
        aprobados,
        pendientes,
        rechazados,
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching categoria documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
