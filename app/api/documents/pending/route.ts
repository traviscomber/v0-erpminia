import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { DocumentService } from '@/lib/services/document.service';
import { DocumentApprovalWorkflowService } from '@/lib/services/document-approval-workflow.service';

/**
 * GET /api/documents/pending/approvals
 * Obtener documentos pendientes de aprobación del usuario actual
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await rbacMiddleware(request, {
      requiredPermissions: [{ resource: 'documents', action: 'read' }],
    });

    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
    }

    const pendingApprovals = await DocumentService.getPendingApprovals(
      auth.userId!,
      auth.organizationId!
    );

    // Enriquecer con estado del workflow
    const enriched = pendingApprovals.map((approval: any) => ({
      ...approval,
      workflowStatus: DocumentApprovalWorkflowService.getWorkflowSummary([approval]),
    }));

    return NextResponse.json({ approvals: enriched, total: enriched.length });
  } catch (error) {
    console.error('[API] GET /documents/pending/approvals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
