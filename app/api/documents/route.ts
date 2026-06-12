import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listDocumentsForOrganization } from '@/lib/api/documents';
import { DocumentService } from '@/lib/services/document.service';

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function hasAllowedExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? ALLOWED_EXTENSIONS.includes(extension) : false;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Number(searchParams.get('limit') || '50');
    const offset = Number(searchParams.get('offset') || '0');

    const data = await listDocumentsForOrganization(auth.organizationId, {
      status,
      category,
      search,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('[v0] Error fetching documents:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const documentType = String(formData.get('documentType') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const file = formData.get('file');

    if (!title || !documentType || !category || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'title, documentType, category and file are required' },
        { status: 400 }
      );
    }

    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds 50MB limit' },
        { status: 400 }
      );
    }

    const result = await DocumentService.uploadDocument({
      organizationId: auth.organizationId,
      title,
      description: description || undefined,
      documentType,
      category,
      file,
      createdBy: auth.user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
