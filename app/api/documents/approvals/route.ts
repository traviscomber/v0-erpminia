import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { DocumentApprovalWorkflowService } from '@/lib/services/document-approval-workflow.service';
import { DocumentService } from '@/lib/services/document.service';

/**
 * GET /api/documents/approvals/workflow
 * Obtener estado del workflow de aprobación
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await rbacMiddleware(request, {
      requiredPermissions: [{ resource: 'documents', action: 'read' }],
    });

    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const workflowStatus = await DocumentApprovalWorkflowService.getWorkflowStatus(documentId);
    const summary = DocumentApprovalWorkflowService.getWorkflowSummary(workflowStatus);
    const history = await DocumentApprovalWorkflowService.getApprovalHistory(documentId);

    return NextResponse.json({
      workflow: workflowStatus,
      summary,
      history,
    });
  } catch (error) {
    console.error('[API] GET /documents/approvals/workflow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/documents/approvals/workflow
 * Obtener estadísticas de aprobaciones por organización
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await rbacMiddleware(request, {
      requiredPermissions: [{ resource: 'documents', action: 'read' }],
    });

    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
    }

    const stats = await DocumentApprovalWorkflowService.getApprovalStats(
      auth.organizationId!
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API] POST /documents/approvals/workflow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
