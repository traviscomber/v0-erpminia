export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  buildSubcontractorSessionPayload,
  createSubcontractorCookieValue,
  deriveSubcontractorPassword,
  ensurePortalCarpeta,
  findMatchingEeccRecords,
  normalizeRutDigits,
} from '@/lib/subcontractor-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rutInput = String(body.rut || '').trim();
    const password = String(body.password || '');
    const rut = normalizeRutDigits(rutInput);

    if (!rut) {
      return NextResponse.json({ error: 'El RUT es obligatorio' }, { status: 400 });
    }

    const expectedPassword = deriveSubcontractorPassword(rut);
    if (!expectedPassword || password !== expectedPassword) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const eeccList = await findMatchingEeccRecords(supabase, rut);

    if (eeccList.length === 0) {
      return NextResponse.json(
        { error: 'No existe una EECC registrada para este RUT' },
        { status: 404 }
      );
    }

    const eecc = eeccList.find((item) => item.is_active) || eeccList[0];
    const carpetaResult = await ensurePortalCarpeta(supabase, eecc, rut);

    const sessionPayload = buildSubcontractorSessionPayload({
      rut,
      eeccId: eecc.id,
      eeccName: eecc.name,
      contactoEmail: eecc.email || undefined,
    });

    const cookieValue = await createSubcontractorCookieValue(sessionPayload);
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      session: {
        rut,
        eecc: {
          id: eecc.id,
          name: eecc.name,
          rut: eecc.rut,
          representative: eecc.representative,
          email: eecc.email,
          phone: eecc.phone,
          is_active: eecc.is_active,
          notes: eecc.notes,
        },
        carpeta: carpetaResult.carpeta,
        can_upload: Boolean(carpetaResult.carpeta),
        warning: carpetaResult.warning,
      },
    });

    response.cookies.set('subcontractor_token', cookieValue, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    return response;
  } catch (error) {
    console.error('[portal-subcontratistas] login error:', error);
    return NextResponse.json({ error: 'No se pudo iniciar sesion' }, { status: 500 });
  }
}
