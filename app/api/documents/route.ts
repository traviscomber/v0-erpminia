import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { DocumentService } from '@/lib/services/document.service';
import { MultiTenantService } from '@/lib/services/multitenant.service';
import { AuditTrailService } from '@/lib/services/audittrail.service';

/**
 * GET /api/documents
 * Listar documentos con filtros
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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await DocumentService.listDocuments(auth.organizationId!, {
      status: status || undefined,
      category: category || undefined,
      search: search || undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] GET /documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Crear documento nuevo
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await rbacMiddleware(request, {
      requiredPermissions: [{ resource: 'documents', action: 'create' }],
    });

    if (!auth.isAuthorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const documentType = formData.get('documentType') as string;
    const category = formData.get('category') as string;
    const templateId = formData.get('templateId') as string | undefined;
    const file = formData.get('file') as File;

    if (!title || !documentType || !category || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await DocumentService.uploadDocument({
      organizationId: auth.organizationId!,
      title,
      description,
      documentType,
      category,
      templateId,
      file,
      createdBy: auth.user.id,
    });

    // Log a audit trail
    await AuditTrailService.logAction({
      organizationId: auth.organizationId!,
      userId: auth.user.id,
      action: 'create',
      resourceType: 'document',
      resourceId: result.documentId,
      newValues: { title, documentType, category },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[API] POST /documents error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
