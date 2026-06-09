import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/auth/org-context';

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const category = formData.get('category') as string;
    const expiryDate = formData.get('expiryDate') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = `${context.organizationId}/${Date.now()}-${file.name}`;
    const buffer = await file.arrayBuffer();

    // Store file path in database
    const { data, error } = await context.supabase
      .from('legal_documents')
      .insert({
        organization_id: context.organizationId,
        document_name: file.name,
        document_type: documentType,
        category: category,
        file_path: fileName,
        file_size: file.size,
        expiry_date: expiryDate,
        compliance_level: 'required',
        status: 'active',
        uploaded_by: context.userId,
        uploaded_at: new Date().toISOString(),
      })
      .select('id, document_name, file_path, uploaded_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      document_id: data.id,
      file_url: fileName,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
