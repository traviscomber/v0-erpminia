import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listDocumentsForOrganization } from '@/lib/api/documents';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const result = await listDocumentsForOrganization(auth.organizationId, {
      status: searchParams.get('status'),
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      limit: Number(searchParams.get('limit') || '50'),
      offset: Number(searchParams.get('offset') || '0'),
    });

    const requestedCategory = searchParams.get('category');
    const documents = requestedCategory
      ? result.documents
      : result.documents.filter((document: any) =>
          ['compliance', 'regulatory'].includes(document.category)
        );

    return NextResponse.json({
      documents,
      total: requestedCategory ? result.total : documents.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch legal documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
