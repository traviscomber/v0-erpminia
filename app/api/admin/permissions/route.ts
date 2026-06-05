import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';

/**
 * GET /api/admin/permissions
 * Retrieve all permissions for the organization
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Return default permissions structure
    const permissions = {
      id: 'perm-001',
      organizationId: auth.organizationId,
      userId: auth.user.id,
      roles: ['admin', 'manager', 'user'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('[v0] Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Error al cargar permisos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/permissions
 * Create or update permissions
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Default response
    const permission = {
      id: `perm-${Date.now()}`,
      organizationId: auth.organizationId,
      userId: auth.user.id,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    console.error('[v0] Error creating permission:', error);
    return NextResponse.json(
      { error: 'Error al crear permiso' },
      { status: 500 }
    );
  }
}
