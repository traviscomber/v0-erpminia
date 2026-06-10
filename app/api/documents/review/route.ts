import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { documentId, action, observations, reviewLevel } = await request.json();

    if (!documentId || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { data: doc } = await supabase
      .from('module_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    let newStatus = '';
    let updateData: any = {};

    if (action === 'approve') {
      newStatus = reviewLevel === 'L1' ? 'pending_l2' : 'active';
      updateData = {
        status: newStatus,
        ...(reviewLevel === 'L1' && { l1_observations: observations || null }),
        ...(reviewLevel === 'L2' && { l2_observations: observations || null }),
      };
    } else {
      newStatus = reviewLevel === 'L1' ? 'draft' : 'pending_l1';
      updateData = {
        status: newStatus,
        ...(reviewLevel === 'L1' && { l1_observations: observations }),
        ...(reviewLevel === 'L2' && { l2_observations: observations }),
      };
    }

    await supabase.from('module_documents').update(updateData).eq('id', documentId);

    return Response.json({
      success: true,
      message: 'Documento procesado correctamente',
      newStatus,
    });
  } catch (error) {
    console.error('Review error:', error);
    return Response.json({ error: 'Error processing review' }, { status: 500 });
  }
}
