import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get auth token from header
    const authHeader = (request as any).headers?.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'No authentication token' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { documentId, action, observations, reviewLevel } = await request.json();

    if (!documentId || !['approve', 'reject'].includes(action)) {
      return Response.json(
        { error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    if (!reviewLevel || !['L1', 'L2'].includes(reviewLevel)) {
      return Response.json(
        { error: 'Review level must be L1 or L2' },
        { status: 400 }
      );
    }

    // Get document
    const { data: doc } = await supabase
      .from('module_documents')
      .select('*, module')
      .eq('id', documentId)
      .single();

    if (!doc) {
      return Response.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Verify user has reviewer access to this module
    const { data: moduleAccess, error: accessError } = await supabase
      .from('user_module_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('module_id', doc.module)
      .eq('status', 'active')
      .maybeSingle();

    if (accessError || !moduleAccess) {
      console.error('[v0] Review access denied:', {
        userId: user.id,
        module: doc.module,
      });
      return Response.json(
        { error: 'No tienes acceso a este módulo' },
        { status: 403 }
      );
    }

    // Verify user has reviewer or admin role
    if (!['reviewer', 'admin'].includes(moduleAccess.role)) {
      return Response.json(
        { error: 'No tienes rol de revisor en este módulo' },
        { status: 403 }
      );
    }

    let newStatus = '';
    let updateData: any = {};

    if (action === 'approve') {
      newStatus = reviewLevel === 'L1' ? 'pending_l2' : 'active';
      updateData = {
        status: newStatus,
        ...(reviewLevel === 'L1' && {
          reviewed_by_l1: user.id,
          reviewed_at_l1: new Date().toISOString(),
          l1_status: 'approved',
          l1_observations: observations || null,
        }),
        ...(reviewLevel === 'L2' && {
          reviewed_by_l2: user.id,
          reviewed_at_l2: new Date().toISOString(),
          l2_status: 'approved',
          l2_observations: observations || null,
        }),
      };
    } else {
      newStatus = reviewLevel === 'L1' ? 'draft' : 'pending_l1';
      updateData = {
        status: newStatus,
        ...(reviewLevel === 'L1' && {
          reviewed_by_l1: user.id,
          reviewed_at_l1: new Date().toISOString(),
          l1_status: 'rejected',
          l1_observations: observations,
        }),
        ...(reviewLevel === 'L2' && {
          reviewed_by_l2: user.id,
          reviewed_at_l2: new Date().toISOString(),
          l2_status: 'rejected',
          l2_observations: observations,
        }),
      };
    }

    const { error: updateError } = await supabase
      .from('module_documents')
      .update(updateData)
      .eq('id', documentId);

    if (updateError) {
      console.error('[v0] Update error:', updateError);
      return Response.json(
        { error: `Error al procesar revisión: ${updateError.message}` },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Documento procesado correctamente',
      newStatus,
    });
  } catch (error) {
    console.error('[v0] Review error:', error);
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
