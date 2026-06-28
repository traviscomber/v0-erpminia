export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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
    const mineOnly =
      searchParams.get('mine') === 'true' || searchParams.get('user_id') === context.userId;

    let query = context.supabase
      .from('documents')
      .select(
        `
        id,
        title,
        description,
        category,
        document_type,
        status,
        current_file_url,
        file_size_mb,
        file_mime_type,
        created_by,
        created_at,
        updated_at,
        document_approvals (
          id,
          approval_level,
          approval_level_name,
          required_role,
          status,
          assigned_to,
          assigned_to_name,
          approved_by,
          approved_by_name,
          comments,
          rejection_reason,
          approved_at
        )
      `
      )
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (mineOnly) {
      query = query.or(`created_by.eq.${context.userId},submitted_by.eq.${context.userId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (data || []).map((doc: any) => ({
      ...doc,
      documento_nombre: doc.title,
      descripcion: doc.description,
      archivo_url: doc.current_file_url,
      estado: doc.status,
      creador_nombre: context.userName || context.userEmail || context.userId,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los documentos';
    console.error('[sostenibilidad][documentos-flujo] GET fallback:', message);
    return NextResponse.json({ success: true, data: [] });
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
    const documentType = String(body.document_type || 'document').trim();
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
      .select('id, title, description, category, document_type, status, current_file_url, created_by, created_at, updated_at')
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
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el documento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const title = String(body.title || body.documento_nombre || '').trim();
    const description = String(body.description || body.descripcion || '').trim();
    const category = String(body.category || 'sostenibilidad').trim();
    const documentType = String(body.document_type || 'document').trim();
    const status = String(body.status || body.estado || 'draft').trim();
    const fileUrl = String(body.file_url || body.archivo_url || '').trim();
    const fileSizeMb = body.file_size_mb ?? null;
    const fileMimeType = body.file_mime_type ?? null;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const { data: document, error: documentError } = await context.supabase
      .from('documents')
      .update({
        title,
        description: description || null,
        category,
        document_type: documentType,
        status,
        current_file_url: fileUrl || null,
        file_size_mb: fileSizeMb,
        file_mime_type: fileMimeType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .select('id, title, description, category, document_type, status, current_file_url, created_by, created_at, updated_at')
      .single();

    if (documentError) throw documentError;

    await context.supabase.from('document_audit_logs').insert({
      document_id: document.id,
      action: 'updated',
      user_id: context.userId,
      details: `Documento actualizado: ${title}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Document updated successfully',
        data: {
          ...document,
          documento_nombre: document.title,
          descripcion: document.description,
          archivo_url: document.current_file_url,
          estado: document.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el documento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
