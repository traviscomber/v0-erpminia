export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getUserModuleAccess, isAdminRole } from '@/lib/api/module-access';

/**
 * Returns the current user's module access map based on their cargo.
 * Admins get a flag so the client can grant full access without a matrix lookup.
 */
export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);

  if (!auth?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = isAdminRole(auth.role);

  if (admin) {
    return NextResponse.json({
      isAdmin: true,
      hasCargo: false,
      role: auth.role || null,
      access: {},
    });
  }

  const { hasCargo, access } = await getUserModuleAccess(auth.user.id);

  return NextResponse.json({
    isAdmin: false,
    hasCargo,
    role: auth.role || null,
    access,
  });
}
