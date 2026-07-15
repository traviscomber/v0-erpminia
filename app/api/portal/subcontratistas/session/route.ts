export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  ensurePortalCarpeta,
  findMatchingEeccRecords,
  normalizeRutDigits,
  summarizePortalSession,
  verifySubcontractorCookieValue,
} from '@/lib/subcontractor-session';

export async function GET(request: NextRequest) {
  try {
    const session = await verifySubcontractorCookieValue(
      request.cookies.get('subcontractor_token')?.value
    );

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const rut = normalizeRutDigits(session.user.rut);
    const eeccList = await findMatchingEeccRecords(supabase, rut);

    if (eeccList.length === 0) {
      return NextResponse.json(
        { error: 'No existe una EECC registrada para este RUT' },
        { status: 404 }
      );
    }

    const eecc = eeccList.find((item) => item.is_active) || eeccList[0];
    const carpetaResult = await ensurePortalCarpeta(supabase, eecc, rut);
    const portalSession = summarizePortalSession(
      rut,
      eeccList,
      carpetaResult.carpeta,
      carpetaResult.warning
    );

    return NextResponse.json({
      authenticated: true,
      session: {
        session_id: session.user.session_id,
        rut: portalSession.rut,
        rut_display: portalSession.rut_display,
        role: session.role,
      },
      eecc: portalSession.eecc,
      eecc_list: portalSession.eecc_list,
      carpeta: portalSession.carpeta,
      docs: portalSession.docs,
      required_documents: portalSession.required_documents,
      uploaded_count: portalSession.uploaded_count,
      total_documents: portalSession.total_documents,
      can_upload: portalSession.can_upload,
      warning: portalSession.warning,
    });
  } catch (error) {
    console.error('[portal-subcontratistas] session error:', error);
    return NextResponse.json({ error: 'No se pudo cargar la sesion' }, { status: 500 });
  }
}
