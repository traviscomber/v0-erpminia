import { NextRequest, NextResponse } from 'next/server';
import { listDocumentsForOrganization } from '@/lib/api/documents';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

function buildApprovalChain(documentId: string) {
  return [
    {
      document_id: documentId,
      approval_level: 1,
      approval_level_name: 'Jefe de Sostenibilidad',
      required_role: 'jefe_sostenibilidad',
      status: 'pending',
    },
    {
      document_id: documentId,
      approval_level: 2,
      approval_level_name: 'Gerente General',
      required_role: 'gerente_general',
      status: 'pending',
    },
  ];
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Number(searchParams.get('limit') || '50');
    const offset = Number(searchParams.get('offset') || '0');

    const result = await listDocumentsForOrganization(context.organizationId, {
      status,
      category: 'sostenibilidad',
      search,
      limit,
      offset,
    });

    const mapped = (result.documents || []).map((doc: any) => ({
      ...doc,
      documento_nombre: doc.title,
      descripcion: doc.description,
      archivo_url: doc.fileUrl,
      estado: doc.status,
      creador_nombre: context.userName || context.userEmail || context.userId,
      document_approvals: doc.steps || [],
    }));

    return NextResponse.json({ success: true, data: mapped, total: result.total });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const title = String(body.title || body.documento_nombre || '').trim();
    const description = String(body.description || body.descripcion || '').trim();
    const category = String(body.category || 'sostenibilidad').trim();
    const documentType = String(body.document_type || body.documentType || 'document').trim();
    const fileUrl = String(body.file_url || body.archivo_url || '').trim();
    const fileSizeMb = body.file_size_mb ?? null;
    const fileMimeType = body.file_mime_type ?? null;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const { data: document, error: documentError } = await context.supabase
      .from('documents')
      .insert({
        organization_id: context.organizationId,
        title,
        description: description || null,
        category,
        document_type: documentType,
        status: 'draft',
        created_by: context.userId,
        submitted_by: context.userId,
        current_file_url: fileUrl || null,
        file_size_mb: fileSizeMb,
        file_mime_type: fileMimeType,
        updated_at: new Date().toISOString(),
      })
      .select(
        'id, title, description, category, document_type, status, current_file_url, created_by, created_at, updated_at'
      )
      .single();

    if (documentError) throw documentError;

    const { error: approvalError } = await context.supabase
      .from('document_approvals')
      .insert(buildApprovalChain(document.id));

    if (approvalError) throw approvalError;

    await context.supabase.from('document_audit_logs').insert({
      document_id: document.id,
      action: 'created',
      user_id: context.userId,
      details: `Documento creado: ${title}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Document created successfully',
        data: {
          ...document,
          documento_nombre: document.title,
          descripcion: document.description,
          archivo_url: document.current_file_url,
          estado: document.status,
          creador_nombre: context.userName || context.userEmail || context.userId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
