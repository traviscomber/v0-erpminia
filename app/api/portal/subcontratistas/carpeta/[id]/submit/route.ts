export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  ensurePortalCarpeta,
  findMatchingEeccRecords,
  normalizeRutDigits,
  verifySubcontractorCookieValue,
} from '@/lib/subcontractor-session';

const REVIEWERS_EMAIL = ['dennyse@motil.cl', 'javier.vargas@motil.cl', 'gonzalo.canales@motil.cl'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySubcontractorCookieValue(
    request.cookies.get('subcontractor_token')?.value
  );
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id: carpetaId } = await params;
  const supabase = getSupabaseServerClient();
  const rut = normalizeRutDigits(session.user.rut);
  const eeccList = await findMatchingEeccRecords(supabase, rut);
  const eecc = eeccList.find((item) => item.is_active) || eeccList[0];
  const carpetaResult = await ensurePortalCarpeta(supabase, eecc, rut);

  if (!carpetaResult.carpeta) {
    return NextResponse.json(
      { error: carpetaResult.warning || 'No se pudo preparar la carpeta' },
      { status: 409 }
    );
  }

  if (carpetaResult.carpeta.id !== carpetaId) {
    return NextResponse.json({ error: 'Carpeta no autorizada' }, { status: 403 });
  }

  const { data: carpeta, error: carpetaError } = await supabase
    .from('carpetas_arranque')
    .select('*, carpeta_documentos(id, file_name)')
    .eq('id', carpetaId)
    .single();

  if (carpetaError || !carpeta) {
    return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
  }

  if (carpeta.status !== 'pendiente') {
    return NextResponse.json({ error: 'La carpeta ya fue enviada a revision' }, { status: 400 });
  }

  const docsWithFiles = carpeta.carpeta_documentos.filter((d: { file_name: string | null }) => d.file_name);
  if (docsWithFiles.length === 0) {
    return NextResponse.json({ error: 'Debes cargar al menos un documento antes de enviar' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('carpetas_arranque')
    .update({ status: 'en_revision_l1', submitted_at: new Date().toISOString() })
    .eq('id', carpetaId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const emailBody = `
La empresa "${carpeta.empresa_nombre}" ha completado la carga de su Carpeta de Arranque.

Documentos cargados: ${docsWithFiles.length}/19

Por favor ingresa al sistema para revisar y validar los documentos.

Carpeta ID: ${carpetaId}
Contacto EECC: ${carpeta.contacto_email || 'Sin correo'}
  `.trim();

  await Promise.allSettled(
    REVIEWERS_EMAIL.map((to) =>
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sostenibilidad/notifications/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: `Nueva Carpeta de Arranque lista para revision: ${carpeta.empresa_nombre}`,
          body: emailBody,
          type: 'carpeta_arranque_submitted',
        }),
      })
    )
  );

  return NextResponse.json({ message: 'Carpeta enviada a revision exitosamente', docsCount: docsWithFiles.length });
}
