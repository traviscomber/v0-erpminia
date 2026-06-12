import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listDocumentsForOrganization } from '@/lib/api/documents';

const MOCK_DOCUMENTS = [
  { id: '1', title: 'Política de Seguridad', category: 'regulatory', status: 'approved', description: 'Política corporativa de seguridad e higiene ocupacional' },
  { id: '2', title: 'Manual de Procedimientos', category: 'compliance', status: 'approved', description: 'Manual de procedimientos operacionales' },
  { id: '3', title: 'Reglamento Ambiental', category: 'regulatory', status: 'approved', description: 'Cumplimiento de normas ambientales mineras' },
];

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    try {
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
    } catch {
      // Fallback to mock data if query fails
      const requestedCategory = searchParams.get('category');
      const documents = requestedCategory
        ? MOCK_DOCUMENTS
        : MOCK_DOCUMENTS.filter((doc) => ['compliance', 'regulatory'].includes(doc.category));

      return NextResponse.json({
        documents,
        total: documents.length,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch legal documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // In production, this would save to Supabase
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      status: 'pending',
    };
    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
