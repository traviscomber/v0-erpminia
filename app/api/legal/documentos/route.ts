import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function uploadLegalFile(organizationId: string, file: File) {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
    throw new Error('Tipo de archivo no permitido. Usa PDF, JPG, PNG, DOC o DOCX.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('El archivo excede el limite de 50MB.');
  }

  const blobPath = `legal-documents/${organizationId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const blob = await put(blobPath, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return {
    fileUrl: blob.url,
    filePath: blob.url,
    fileName: file.name,
    fileSizeBytes: file.size,
    fileMimeType: file.type,
  };
}

async function parseRequestPayload(request: NextRequest, organizationId: string, userId: string) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    const uploadedFile =
      file instanceof File && file.size > 0 ? await uploadLegalFile(organizationId, file) : null;

    return {
      organizationId,
      userId,
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || '').trim() || undefined,
      documentType: String(formData.get('documentType') || formData.get('document_type') || 'document').trim(),
      category: String(formData.get('category') || 'compliance').trim(),
      status: String(formData.get('status') || 'active').trim(),
      expiryDate: String(formData.get('expiryDate') || formData.get('expiry_date') || '').trim() || undefined,
      ...uploadedFile,
    };
  }

  const body = await request.json();
  return {
    organizationId,
    userId,
    title: String(body.title || body.documento_nombre || '').trim(),
    description: String(body.description || body.descripcion || '').trim() || undefined,
    documentType: String(body.documentType || body.document_type || 'document').trim(),
    category: String(body.category || 'compliance').trim(),
    status: String(body.status || 'active').trim(),
    expiryDate: String(body.expiryDate || body.expiry_date || '').trim() || undefined,
    fileUrl: String(body.fileUrl || body.file_url || '').trim() || undefined,
    filePath: String(body.filePath || body.file_path || '').trim() || undefined,
    fileName: String(body.fileName || body.file_name || '').trim() || undefined,
    fileSizeBytes: Number(body.fileSizeBytes || body.file_size_bytes || 0) || undefined,
    fileMimeType: String(body.fileMimeType || body.file_mime_type || '').trim() || undefined,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || null;
    const category = searchParams.get('category')?.trim() || null;

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from('legal_documents')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('uploaded_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (search) {
      query = query.or(
        `document_name.ilike.%${search}%,document_type.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const documents = (data || []).map((document) => ({
      id: document.id,
      title: document.document_name,
      document_name: document.document_name,
      description: document.description || '',
      category: document.category,
      documentType: document.document_type,
      document_type: document.document_type,
      status: document.status,
      fileUrl: document.file_path || undefined,
      file_url: document.file_path || undefined,
      file_size_bytes: document.file_size || undefined,
      expiryDate: document.expiry_date || undefined,
      valid_until: document.expiry_date || undefined,
      createdAt: document.uploaded_at || document.created_at,
      uploaded_at: document.uploaded_at || document.created_at,
      uploadedBy: document.uploaded_by || undefined,
    }));

    return NextResponse.json({ documents, total: count || documents.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch legal documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await parseRequestPayload(request, auth.organizationId, auth.user.id);

    if (!payload.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('legal_documents')
      .insert({
        organization_id: payload.organizationId,
        document_name: payload.title,
        document_type: payload.documentType,
        category: payload.category,
        description: payload.description || null,
        status: payload.status,
        expiry_date: payload.expiryDate || null,
        file_path: payload.filePath || payload.fileUrl || null,
        file_size: payload.fileSizeBytes || null,
        file_mime_type: payload.fileMimeType || null,
        compliance_level: 'required',
        uploaded_by: payload.userId,
        uploaded_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        document: {
          id: data.id,
          title: data.document_name,
          document_name: data.document_name,
          description: data.description || '',
          category: data.category,
          documentType: data.document_type,
          document_type: data.document_type,
          status: data.status,
          fileUrl: data.file_path || undefined,
          file_url: data.file_path || undefined,
          file_size_bytes: data.file_size || undefined,
          expiryDate: data.expiry_date || undefined,
          valid_until: data.expiry_date || undefined,
          uploaded_at: data.uploaded_at || undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create legal document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
