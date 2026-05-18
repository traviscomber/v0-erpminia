import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { DocumentService } from '@/lib/services/document.service';
import { DocumentApprovalWorkflowService } from '@/lib/services/document-approval-workflow.service';
import { AuditTrailService } from '@/lib/services/audittrail.service';

export type RouteHandlerConfig = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/documents/[id]
 * Obtener documento específico con todas las relaciones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await rbacMiddleware(request, {
      requiredPermissions: [{ resource: 'documents', action: 'read' }],
    });

    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
    }

    const document = await DocumentService.getDocument(id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verificar que el usuario tiene acceso a este documento
    if (document.organization_id !== auth.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('[API] GET /documents/{id} error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/documents/[id]
 * Aprobar documento
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await rbacMiddleware(request, {
      requiredPermissions: [{ resource: 'documents', action: 'approve' }],
    });

    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
    }

    const body = await request.json();
    const { approvalLevelId, comments } = body;

    if (!approvalLevelId) {
      return NextResponse.json({ error: 'Missing approvalLevelId' }, { status: 400 });
    }

    const result = await DocumentService.approveDocument(
      id,
      approvalLevelId,
      auth.user.id,
      comments
    );

    // Log a audit trail
    await AuditTrailService.logAction({
      organizationId: auth.organizationId!,
      userId: auth.user.id,
      action: 'approve',
      resourceType: 'document',
      resourceId: id,
      newValues: { approvalLevelId, comments },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] PUT /documents/{id} error:', error);
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/[id]
 * Rechazar documento (solo en draft/submitted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await rbacMiddleware(request, {
      requiredPermissions: [{ resource: 'documents', action: 'delete' }],
    });

    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
    }

    const body = await request.json();
    const { approvalLevelId, rejectionReason } = body;

    if (!approvalLevelId || !rejectionReason) {
      return NextResponse.json(
        { error: 'Missing approvalLevelId or rejectionReason' },
        { status: 400 }
      );
    }

    const result = await DocumentService.rejectDocument(
      id,
      approvalLevelId,
      auth.user.id,
      rejectionReason
    );

    // Log a audit trail
    await AuditTrailService.logAction({
      organizationId: auth.organizationId!,
      userId: auth.user.id,
      action: 'reject',
      resourceType: 'document',
      resourceId: id,
      newValues: { approvalLevelId, rejectionReason },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] DELETE /documents/{id} error:', error);
    return NextResponse.json({ error: 'Rejection failed' }, { status: 500 });
  }
}
