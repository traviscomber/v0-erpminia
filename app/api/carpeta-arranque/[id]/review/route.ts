import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// POST /api/carpeta-arranque/[id]/review
// Body: { level: 1 | 2, reviews: [{ slot_index, status: 'cumple'|'no_cumple', observaciones? }] }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveAuthContext(request);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id: carpetaId } = await params;
  const body = await request.json();
  const { level, reviews } = body as {
    level: 1 | 2;
    reviews: Array<{ slot_index: number; status: 'cumple' | 'no_cumple'; observaciones?: string }>;
  };

  if (!level || !reviews?.length) {
    return NextResponse.json({ error: 'Faltan parametros: level y reviews' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: carpeta, error: carpetaError } = await supabase
    .from('carpetas_arranque')
    .select('*, carpeta_documentos(*)')
    .eq('id', carpetaId)
    .single();

  if (carpetaError || !carpeta) {
    return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
  }

  // Validate: no_cumple reviews must have observaciones
  for (const r of reviews) {
    if (r.status === 'no_cumple' && !r.observaciones?.trim()) {
      return NextResponse.json(
        { error: `El documento en slot ${r.slot_index} requiere una observacion cuando se marca "No Cumple"` },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();
  const prefix = level === 1 ? 'l1' : 'l2';

  // Update each reviewed document slot
  await Promise.all(
    reviews.map(r =>
      supabase
        .from('carpeta_documentos')
        .update({
          [`${prefix}_status`]: r.status,
          [`${prefix}_observaciones`]: r.observaciones ?? null,
          [`${prefix}_reviewed_by`]: auth.user.id,
          [`${prefix}_reviewed_at`]: now,
          updated_at: now,
        })
        .eq('carpeta_id', carpetaId)
        .eq('slot_index', r.slot_index)
    )
  );

  // Determine new carpeta status based on all reviews
  const { data: allDocs } = await supabase
    .from('carpeta_documentos')
    .select('l1_status, l2_status, file_name')
    .eq('carpeta_id', carpetaId);

  const uploadedDocs = allDocs?.filter(d => d.file_name) ?? [];
  const anyL1NoCumple = uploadedDocs.some(d => d.l1_status === 'no_cumple');
  const allL1Done = uploadedDocs.every(d => d.l1_status !== null);
  const anyL2NoCumple = uploadedDocs.some(d => d.l2_status === 'no_cumple');
  const allL2Done = uploadedDocs.every(d => d.l2_status !== null);

  let newCarpetaStatus = carpeta.status;
  const revisorNombre = auth.user.full_name ?? auth.user.email ?? 'Revisor';

  if (level === 1) {
    const update: Record<string, unknown> = {
      revisor_l1_id: auth.user.id,
      revisor_l1_nombre: revisorNombre,
      revisor_l1_fecha: now,
    };
    if (allL1Done) {
      newCarpetaStatus = anyL1NoCumple ? 'rechazado' : 'en_revision_l2';
      update.revisor_l1_status = anyL1NoCumple ? 'no_cumple' : 'cumple';
      update.status = newCarpetaStatus;
    }
    await supabase.from('carpetas_arranque').update(update).eq('id', carpetaId);
  } else {
    const update: Record<string, unknown> = {
      revisor_l2_id: auth.user.id,
      revisor_l2_nombre: revisorNombre,
      revisor_l2_fecha: now,
    };
    if (allL2Done) {
      newCarpetaStatus = anyL2NoCumple ? 'rechazado' : 'aprobado';
      update.revisor_l2_status = anyL2NoCumple ? 'no_cumple' : 'cumple';
      update.status = newCarpetaStatus;
    }
    await supabase.from('carpetas_arranque').update(update).eq('id', carpetaId);
  }

  // If any doc rejected, notify the EECC contact
  const rejectedReviews = reviews.filter(r => r.status === 'no_cumple');
  if (rejectedReviews.length > 0) {
    const observacionesList = rejectedReviews
      .map(r => `- Documento ${r.slot_index}: ${r.observaciones}`)
      .join('\n');

    const emailBody = `
Estimado/a,

Se ha completado la revision de su Carpeta de Arranque para la empresa "${carpeta.empresa_nombre}".

Los siguientes documentos requieren correccion:

${observacionesList}

Por favor ingresa al sistema y sube las versiones corregidas.

Revisor: ${revisorNombre} (Nivel ${level})
    `.trim();

    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/sostenibilidad/notifications/email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: carpeta.contacto_email,
          subject: `Documentos rechazados en Carpeta de Arranque - ${carpeta.empresa_nombre}`,
          body: emailBody,
          type: 'carpeta_arranque_rejected',
        }),
      }
    ).catch(() => {});
  }

  return NextResponse.json({
    message: 'Revision guardada exitosamente',
    carpeta_status: newCarpetaStatus,
    rejected_count: rejectedReviews.length,
  });
}
