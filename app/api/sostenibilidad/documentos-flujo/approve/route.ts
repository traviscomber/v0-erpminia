import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '@/lib/notification-service';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials are not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface ApprovalRequest {
  document_id: string;
  approval_level: number;
  action: 'approve' | 'reject';
  comments?: string;
  user_id: string;
  user_role: string;
}

async function notifyDocumentOwner(
  supabase: ReturnType<typeof getSupabaseClient>,
  payload: {
    documentId: string;
    documentTitle: string;
    recipientUserId?: string | null;
    action: 'approve' | 'reject';
    approvalLevel: number;
    comments?: string;
  }
) {
  if (!payload.recipientUserId) return;

  const { data: recipient } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', payload.recipientUserId)
    .maybeSingle();

  const isApproval = payload.action === 'approve';
  const notification = {
    user_id: payload.recipientUserId,
    type: isApproval ? ('document_approved' as const) : ('document_rejected' as const),
    title: isApproval
      ? `Documento aprobado: ${payload.documentTitle}`
      : `Documento rechazado: ${payload.documentTitle}`,
    message: isApproval
      ? `Tu documento "${payload.documentTitle}" fue aprobado en el nivel ${payload.approvalLevel}.`
      : `Tu documento "${payload.documentTitle}" fue rechazado en el nivel ${payload.approvalLevel}.${
          payload.comments ? ` Observaciones: ${payload.comments}` : ''
        }`,
    document_id: payload.documentId,
    read: false,
    action_url: `/dashboard/sostenibilidad/documentos-flujo?documentId=${payload.documentId}`,
  };

  await supabase.from('notifications').insert(notification);

  if (recipient?.email) {
    await NotificationService.queueEmail(
      {
        id: payload.documentId,
        user_id: payload.recipientUserId,
        document_id: payload.documentId,
        document_title: payload.documentTitle,
        approval_level: payload.approvalLevel,
        approval_level_name: `Nivel ${payload.approvalLevel}`,
        type: isApproval ? 'approved' : 'rejected',
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
    const supabase = getSupabaseClient();
    const body: ApprovalRequest = await request.json();
    const { document_id, approval_level, action, comments, user_id, user_role } = body;

    if (!document_id || !approval_level || !action || !user_id || !user_role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: approval, error: getError } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', document_id)
      .eq('approval_level', approval_level)
      .single();

    if (getError || !approval) {
      return NextResponse.json({ error: 'Approval record not found' }, { status: 404 });
    }

    if (approval.required_role !== user_role) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve at this level' },
        { status: 403 }
      );
    }

    const { data: document } = await supabase
      .from('documents')
      .select('id, title, submitted_by, created_by')
      .eq('id', document_id)
      .maybeSingle();

    const { data: updatedApproval, error: updateError } = await supabase
      .from('document_approvals')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: user_id,
        approved_at: new Date().toISOString(),
        comments,
        rejection_reason: action === 'reject' ? comments : null,
      })
      .eq('id', approval.id)
      .select()
      .single();

    if (updateError) {
      console.error('[v0] Error updating approval:', updateError);
      return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
    }

    if (action === 'approve') {
      const { data: allApprovals } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', document_id)
        .order('approval_level', { ascending: true });

      let newDocStatus = 'under_review';

      if (allApprovals && allApprovals.length > 0) {
        const isLastLevel = approval_level === Math.max(...allApprovals.map((a: { approval_level: number }) => a.approval_level));

        if (isLastLevel) {
          const previousApprovals = allApprovals.filter(
            (a: { approval_level: number; status?: string }) => a.approval_level < approval_level
          );
          const allPreviousApproved = previousApprovals.every((a: { status?: string }) => a.status === 'approved');

          if (allPreviousApproved) {
            newDocStatus = 'approved';
          }
        }
      }

      await supabase
        .from('documents')
        .update({
          status: newDocStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document_id);
    } else {
      await supabase
        .from('documents')
        .update({
          status: 'rejected',
          rejection_reason: comments,
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', document_id);
    }

    await supabase.from('document_audit_logs').insert({
      document_id,
      action: action === 'approve' ? 'approved' : 'rejected',
      user_id,
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} at level ${approval_level}: ${comments || ''}`,
    });

    await notifyDocumentOwner(supabase, {
      documentId: document_id,
      documentTitle: document?.title || 'Documento',
      recipientUserId: (document?.submitted_by as string | null | undefined) || (document?.created_by as string | null | undefined),
      action,
      approvalLevel: approval_level,
      comments,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Document ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        data: updatedApproval,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Error in POST /api/sostenibilidad/documentos-flujo/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
