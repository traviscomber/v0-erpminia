import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Roles allowed to review documents
const REVIEWER_ROLES = ['reviewer', 'admin', 'supervisor', 'manager', 'gerente'];

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado. Inicia sesión nuevamente.' },
        { status: 401 }
      );
    }

    const { documentId, action, observations, reviewLevel } = await request.json();

    if (!documentId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    if (!reviewLevel || !['L1', 'L2'].includes(reviewLevel)) {
      return NextResponse.json(
        { error: 'El nivel de revisión debe ser L1 o L2' },
        { status: 400 }
      );
    }

    // Only reviewers/admins can act on the review workflow
    if (auth.role && !REVIEWER_ROLES.includes(auth.role)) {
      return NextResponse.json(
        { error: 'No tienes rol de revisor para esta acción' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServerClient();

    const { data: doc } = await supabase
      .from('module_documents')
      .select('id')
      .eq('id', documentId)
      .single();

    if (!doc) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    let newStatus = '';
    let updateData: Record<string, unknown> = {};

    if (action === 'approve') {
      newStatus = reviewLevel === 'L1' ? 'pending_l2' : 'active';
      updateData = {
        status: newStatus,
        ...(reviewLevel === 'L1' && {
          reviewed_by_l1: auth.user.id,
          reviewed_at_l1: new Date().toISOString(),
          l1_status: 'approved',
          l1_observations: observations || null,
        }),
        ...(reviewLevel === 'L2' && {
          reviewed_by_l2: auth.user.id,
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
          reviewed_by_l1: auth.user.id,
          reviewed_at_l1: new Date().toISOString(),
          l1_status: 'rejected',
          l1_observations: observations,
        }),
        ...(reviewLevel === 'L2' && {
          reviewed_by_l2: auth.user.id,
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
      return NextResponse.json(
        { error: `Error al procesar revisión: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Documento procesado correctamente',
      newStatus,
    });
  } catch (error) {
    console.error('[v0] Review error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
