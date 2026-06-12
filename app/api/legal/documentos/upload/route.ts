import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { DocumentService } from '@/lib/services/document.service';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const title = String(formData.get('title') || file.name).trim();
    const description = String(formData.get('description') || '').trim() || undefined;
    const documentType = String(formData.get('documentType') || formData.get('category') || 'legal').trim();
    const category = String(formData.get('category') || 'legal').trim();
    const expiryDate = String(formData.get('expiryDate') || '').trim();

    const uploaded = await DocumentService.uploadDocument({
      organizationId: auth.organizationId,
      createdBy: auth.user.id,
      title,
      description,
      documentType,
      category,
      file,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
