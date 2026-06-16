export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client only when needed to avoid build-time errors
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
  comments: string;
  user_id: string;
  user_role: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body: ApprovalRequest = await request.json();
    const { document_id, approval_level, action, comments, user_id, user_role } = body;

    // Validaciones
    if (!document_id || !approval_level || !action || !user_id || !user_role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get current approval record
    const { data: approval, error: getError } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', document_id)
      .eq('approval_level', approval_level)
      .single();

    if (getError || !approval) {
      return NextResponse.json(
        { error: 'Approval record not found' },
        { status: 404 }
      );
    }

    // Verify user role matches required role
    if (approval.required_role !== user_role) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve at this level' },
        { status: 403 }
      );
    }

    // Update approval status
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
      return NextResponse.json(
        { error: 'No se pudo actualizar approval' },
        { status: 500 }
      );
    }

    // If approved, check if all previous levels are approved and update document status
    if (action === 'approve') {
      // Get all approvals for this document
      const { data: allApprovals } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', document_id)
        .order('approval_level', { ascending: true });

      // Determine document status based on approval chain
      let newDocStatus = 'under_review';
      let allApproved = true;

      if (allApprovals && allApprovals.length > 0) {
        // Check if current level is the last one
        const isLastLevel = approval_level === Math.max(...allApprovals.map((a: any) => a.approval_level));

        if (isLastLevel) {
          // Check if all previous levels are approved
          const previousApprovals = allApprovals.filter((a: any) => a.approval_level < approval_level);
          const allPreviousApproved = previousApprovals.every((a: any) => a.status === 'approved');

          if (allPreviousApproved) {
            newDocStatus = 'approved';
          } else {
            newDocStatus = 'under_review';
          }
        } else {
          newDocStatus = 'under_review';
        }
      }

      // Update document status
      await supabase
        .from('documents')
        .update({
          status: newDocStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document_id);
    } else if (action === 'reject') {
      // If rejected, update document status to rejected
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

    // Log audit trail
    await supabase.from('document_audit_logs').insert({
      document_id,
      action: action === 'approve' ? 'approved' : 'rejected',
      user_id,
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} at level ${approval_level}: ${comments || ''}`,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
