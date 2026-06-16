export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { DocumentService } from '@/lib/services/document.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { approvalId, reason } = await request.json();

    if (!approvalId || !reason) {
      return NextResponse.json(
        { error: 'approvalId and reason are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: approval } = await supabase
      .from('document_approvals')
      .select('id, assigned_to, status')
      .eq('id', approvalId)
      .eq('document_id', id)
      .maybeSingle();

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    if (approval.assigned_to && approval.assigned_to !== auth.user.id) {
      return NextResponse.json({ error: 'Approval assigned to another user' }, { status: 403 });
    }

    if (approval.status !== 'pending') {
      return NextResponse.json({ error: 'Approval is not pending' }, { status: 409 });
    }

    await DocumentService.rejectDocument(id, approvalId, auth.user.id, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo rechazar el documento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
