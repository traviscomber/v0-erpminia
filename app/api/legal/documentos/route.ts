import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listDocumentsForOrganization } from '@/lib/api/documents';
import { DocumentService } from '@/lib/services/document.service';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const result = await listDocumentsForOrganization(auth.organizationId, {
      status: searchParams.get('status'),
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search'),
      limit: Number(searchParams.get('limit') || '50'),
      offset: Number(searchParams.get('offset') || '0'),
    });

    const legalCategories = new Set(['compliance', 'regulatory', 'legal']);
    const requestedCategory = searchParams.get('category');
    const documents = requestedCategory
      ? result.documents
      : result.documents.filter((document: any) => legalCategories.has(String(document.category || '').toLowerCase()));

    return NextResponse.json({
      documents,
      total: requestedCategory ? result.total : documents.length,
    });
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
    const contentType = request.headers.get('content-type') || '';
    const supabase = getSupabaseServerClient();

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const fileName = file instanceof File ? file.name : '';
      const title = String(formData.get('title') || '').trim() || String(fileName || '').trim();
      const description = String(formData.get('description') || '').trim() || undefined;
      const documentType = String(formData.get('documentType') || formData.get('category') || 'legal').trim();
      const category = String(formData.get('category') || 'legal').trim();

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
      }

      const uploaded = await DocumentService.uploadDocument({
        organizationId: auth.organizationId,
        createdBy: auth.user.id,
        title: title || file.name,
        description,
        documentType,
        category,
        file,
      });

      return NextResponse.json(uploaded, { status: 201 });
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const category = String(body.category || 'legal').trim();
    const documentType = String(body.documentType || category || 'legal').trim();
    const { data, error } = await supabase
      .from('documents')
      .insert({
        organization_id: auth.organizationId,
        title,
        description: String(body.description || '').trim() || null,
        document_type: documentType,
        category,
        status: 'draft',
        created_by: auth.user.id,
        search_text: `${title} ${body.description || ''} ${category} ${documentType}`.trim(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

