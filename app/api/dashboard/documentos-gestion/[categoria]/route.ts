export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

type FlujoDocumentoRow = {
  id: string | number;
  documento_id?: string | number | null;
  documento_nombre?: string | null;
  version?: string | number | null;
  estado?: string | null;
  creador_nombre?: string | null;
  validador1_nombre?: string | null;
  validador1_rol?: string | null;
  validador1_accion?: string | null;
  validador2_nombre?: string | null;
  validador2_rol?: string | null;
  validador2_accion?: string | null;
  activo?: boolean | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ categoria: string }> }
) {
  try {
    const { categoria } = await params;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
    }

    const response = await fetch(`${url}/rest/v1/flujo_aprobacion_documentos_sostenibilidad?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    const allDocs = (await response.json()) as FlujoDocumentoRow[] | { error?: string };

    if (!Array.isArray(allDocs)) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 });
    }

    const categoryMap: Record<string, string[]> = {
      seguridad: ['MSDS', 'Seguridad', 'Protocolo', 'Auditoria'],
      ambiental: ['Ambiental', 'Residuos', 'Impacto'],
      operacional: ['Procedimiento', 'Instructivo', 'Plan'],
      laboral: ['RIOHS', 'Capacitacion', 'Permiso'],
    };

    const keywords = categoryMap[categoria] || [];

    const documents = allDocs
      .filter((doc) => {
        const name = String(doc.documento_nombre || '').toLowerCase();
        return keywords.some((kw) => name.includes(kw.toLowerCase()));
      })
      .map((doc) => ({
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

    const aprobados = documents.filter((d: any) => d.estado === 'aprobado');
    const pendientes = documents.filter(
      (d) => d.estado === 'pendiente_validador1' || d.estado === 'pendiente_validador2'
    );
    const rechazados = documents.filter((d) => d.estado === 'rechazado');

    return NextResponse.json({
      categoria,
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
    return NextResponse.json({ error: 'No se pudieron obtener los documentos' }, { status: 500 });
  }
}
