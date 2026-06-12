import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

const REVIEWER_ROLES = ['reviewer', 'admin', 'supervisor', 'manager', 'gerente'];

type ReviewLevel = 'L1' | 'L2';
type ReviewAction = 'approve' | 'reject';

async function queueDocumentReviewNotification(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  payload: {
    userId?: string | null;
    documentId: string;
    documentTitle: string;
    action: ReviewAction;
    reviewLevel: ReviewLevel;
    observations?: string | null;
  }
) {
  if (!payload.userId) return;

  const { data: recipient } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', payload.userId)
    .maybeSingle();

  const reviewLabel = payload.reviewLevel === 'L1' ? 'Nivel 1' : 'Nivel 2';
  const notification =
    payload.action === 'approve'
      ? {
          user_id: payload.userId,
          type: 'document_approved' as const,
          title:
            payload.reviewLevel === 'L1'
              ? `Documento aprobado en ${reviewLabel}`
              : 'Documento aprobado',
          message:
            payload.reviewLevel === 'L1'
              ? `Tu documento "${payload.documentTitle}" fue aprobado en ${reviewLabel} y sigue a la siguiente validacion.`
              : `Tu documento "${payload.documentTitle}" fue aprobado y quedo en estado activo.`,
          document_id: payload.documentId,
          read: false,
          action_url: `/dashboard/documentos?documentId=${payload.documentId}`,
        }
      : {
          user_id: payload.userId,
          type: 'document_rejected' as const,
          title: `Documento rechazado en ${reviewLabel}`,
          message:
            `Tu documento "${payload.documentTitle}" fue rechazado en ${reviewLabel}.` +
            (payload.observations ? ` Observaciones: ${payload.observations}` : ''),
          document_id: payload.documentId,
          read: false,
          action_url: `/dashboard/documentos?documentId=${payload.documentId}`,
        };

  await supabase.from('notifications').insert(notification);

  if (recipient?.email) {
    await NotificationService.queueEmail(
      {
        id: payload.documentId,
        user_id: payload.userId,
        document_id: payload.documentId,
        document_title: payload.documentTitle,
        approval_level: payload.reviewLevel === 'L1' ? 1 : 2,
        approval_level_name: reviewLabel,
        type: payload.action === 'approve' ? 'approved' : 'rejected',
        title: notification.title,
        message: notification.message,
        read: false,
        created_at: new Date().toISOString(),
      },
      recipient.email
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request);
    if (!auth) {
      return NextResponse.json({ error: 'No autenticado. Inicia sesion nuevamente.' }, { status: 401 });
    }

    const { documentId, action, observations, reviewLevel } = await request.json();

    if (!documentId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 });
    }

    if (!reviewLevel || !['L1', 'L2'].includes(reviewLevel)) {
      return NextResponse.json({ error: 'El nivel de revision debe ser L1 o L2' }, { status: 400 });
    }

    if (auth.role && !REVIEWER_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: 'No tienes rol de revisor para esta accion' }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    const { data: doc } = await supabase
      .from('module_documents')
      .select('id, document_name, uploaded_by')
      .eq('id', documentId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    let newStatus = '';
    let updateData: Record<string, unknown> = {};

    if (action === 'approve') {
      newStatus = reviewLevel === 'L1' ? 'pending_l2' : 'active';
      updateData = {
        status: newStatus,
        ...(reviewLevel === 'L1' && {
          reviewed_by_l1: auth.user.id,
          reviewed_at_l1: new Date().toISOString(),
          l1_status: 'approved',
          l1_observations: observations || null,
        }),
        ...(reviewLevel === 'L2' && {
          reviewed_by_l2: auth.user.id,
          reviewed_at_l2: new Date().toISOString(),
          l2_status: 'approved',
          l2_observations: observations || null,
        }),
      };
    } else {
      newStatus = reviewLevel === 'L1' ? 'draft' : 'pending_l1';
      updateData = {
        status: newStatus,
        ...(reviewLevel === 'L1' && {
          reviewed_by_l1: auth.user.id,
          reviewed_at_l1: new Date().toISOString(),
          l1_status: 'rejected',
          l1_observations: observations,
        }),
        ...(reviewLevel === 'L2' && {
          reviewed_by_l2: auth.user.id,
          reviewed_at_l2: new Date().toISOString(),
          l2_status: 'rejected',
          l2_observations: observations,
        }),
      };
    }

    const { error: updateError } = await supabase
      .from('module_documents')
      .update(updateData)
      .eq('id', documentId);

    if (updateError) {
      console.error('[v0] Update error:', updateError);
      return NextResponse.json(
        { error: `Error al procesar revision: ${updateError.message}` },
        { status: 500 }
      );
    }

    await queueDocumentReviewNotification(supabase, {
      userId: (doc as { uploaded_by?: string | null }).uploaded_by,
      documentId: doc.id,
      documentTitle: (doc as { document_name?: string | null }).document_name || 'Documento',
      action,
      reviewLevel,
      observations: observations || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Documento procesado correctamente',
      newStatus,
    });
  } catch (error) {
    console.error('[v0] Review error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
