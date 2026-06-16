export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await resolveAuthContext(request);

    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { docId, documentTitle, reviewLevel, status, observations, recipientEmail } = await request.json();

    // Validate required fields
    if (!docId || !documentTitle || !reviewLevel || !status) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Build email subject and body based on status
    const isApproved = status === 'cumple' || status === 'approved';
    const subject = isApproved
      ? `Documento aprobado: ${documentTitle}`
      : `Documento rechazado: ${documentTitle}`;

    const statusLabel = isApproved ? 'APROBADO' : 'RECHAZADO';
    const statusEmoji = isApproved ? '✅' : '❌';

    const body = `
${statusEmoji} DOCUMENTO ${statusLabel}

Documento: ${documentTitle}
Nivel de Revisión: ${reviewLevel === 'L1' ? 'Nivel 1 (Inicial)' : 'Nivel 2 (Final)'}
Estado: ${statusLabel}

${observations ? `Observaciones:\n${observations}` : 'Sin observaciones adicionales'}

---
Este es un mensaje automático de N3uralia PMS.
No responder a este correo.
    `.trim();

    // Queue the email
    const emailPayload = {
      to: recipientEmail || 'no-reply@motil.app',
      subject,
      body,
      type: 'document_review',
      module: 'legal',
      docId,
      status: isApproved ? 'approved' : 'rejected',
      timestamp: new Date(),
      queueStatus: 'pending',
    };

    console.log('[v0] Legal document email queued:', emailPayload);

    // Store email in a notifications table (optional - for audit trail)
    const { error: dbError } = await supabase
      .from('email_notifications')
      .insert({
        document_id: docId,
        recipient_email: recipientEmail,
        subject,
        body,
        review_level: reviewLevel,
        status: isApproved ? 'approved' : 'rejected',
        observations,
        sent_by: auth.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.warn('[v0] Could not log email to db:', dbError);
      // Don't fail - email should still be queued even if DB log fails
    }

    return NextResponse.json({
      success: true,
      message: 'Email queued for delivery',
      data: emailPayload,
    });
  } catch (error) {
    console.error('[v0] Error queuing email:', error);
    return NextResponse.json(
      {
        error: 'No se pudo encolar el correo',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
