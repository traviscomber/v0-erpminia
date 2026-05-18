// FASE 1: API Routes Setup - Ejemplos de cómo usar RBAC, Multi-Tenant y Audit

// =============================================================================
// Este archivo documenta los API routes que deben crearse para FASE 1
// Las rutas siguen el patrón: /api/v1/{resource}/{action}
// =============================================================================

export const FASE1_API_ROUTES = {
  // ─────────────────────────────────────────────────────────────────────────
  // ORGANIZATIONS
  // ─────────────────────────────────────────────────────────────────────────
  'POST /api/v1/organizations': {
    description: 'Crear nueva organización',
    protected: true,
    permissions: ['admin:manage_organization'],
    body: {
      name: 'string',
      slug: 'string',
      industry: 'string',
      timezone: 'string',
    },
  },
  'GET /api/v1/organizations': {
    description: 'Obtener organizaciones del usuario',
    protected: true,
    permissions: [],
  },
  'GET /api/v1/organizations/:id': {
    description: 'Obtener detalles de organización',
    protected: true,
    permissions: [],
  },
  'PUT /api/v1/organizations/:id': {
    description: 'Actualizar organización',
    protected: true,
    permissions: ['admin:manage_organization'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RBAC - ROLES
  // ─────────────────────────────────────────────────────────────────────────
  'POST /api/v1/organizations/:org_id/roles': {
    description: 'Crear nuevo rol',
    protected: true,
    permissions: ['admin:manage_roles'],
    body: {
      name: 'string',
      description: 'string',
    },
  },
  'GET /api/v1/organizations/:org_id/roles': {
    description: 'Obtener roles de organización',
    protected: true,
    permissions: [],
  },
  'POST /api/v1/organizations/:org_id/roles/:role_id/permissions': {
    description: 'Asignar permiso a rol',
    protected: true,
    permissions: ['admin:manage_roles'],
    body: {
      permission_id: 'uuid',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RBAC - USER ROLES
  // ─────────────────────────────────────────────────────────────────────────
  'POST /api/v1/organizations/:org_id/users/:user_id/roles': {
    description: 'Asignar rol a usuario',
    protected: true,
    permissions: ['admin:manage_users'],
    body: {
      role_id: 'uuid',
    },
  },
  'DELETE /api/v1/organizations/:org_id/users/:user_id/roles/:role_id': {
    description: 'Remover rol de usuario',
    protected: true,
    permissions: ['admin:manage_users'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MAESTROS - COST CENTERS
  // ─────────────────────────────────────────────────────────────────────────
  'POST /api/v1/organizations/:org_id/cost-centers': {
    description: 'Crear centro de costo',
    protected: true,
    permissions: ['admin:manage_organization'],
    body: {
      code: 'string',
      name: 'string',
      manager_id: 'uuid',
      budget_annual: 'number',
    },
  },
  'GET /api/v1/organizations/:org_id/cost-centers': {
    description: 'Obtener centros de costo',
    protected: true,
    permissions: [],
  },
  'PUT /api/v1/organizations/:org_id/cost-centers/:id': {
    description: 'Actualizar centro de costo',
    protected: true,
    permissions: ['admin:manage_organization'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MAESTROS - DEPARTMENTS
  // ─────────────────────────────────────────────────────────────────────────
  'POST /api/v1/organizations/:org_id/departments': {
    description: 'Crear departamento',
    protected: true,
    permissions: ['admin:manage_organization'],
    body: {
      code: 'string',
      name: 'string',
      cost_center_id: 'uuid',
    },
  },
  'GET /api/v1/organizations/:org_id/departments': {
    description: 'Obtener departamentos',
    protected: true,
    permissions: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MAESTROS - SUPPLIERS
  // ─────────────────────────────────────────────────────────────────────────
  'POST /api/v1/organizations/:org_id/suppliers': {
    description: 'Crear proveedor',
    protected: true,
    permissions: ['admin:manage_organization'],
    body: {
      name: 'string',
      rut: 'string',
      email: 'string',
      business_type: 'string',
    },
  },
  'GET /api/v1/organizations/:org_id/suppliers': {
    description: 'Obtener proveedores',
    protected: true,
    permissions: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MAESTROS - WAREHOUSES
  // ─────────────────────────────────────────────────────────────────────────
  'POST /api/v1/organizations/:org_id/warehouses': {
    description: 'Crear bodega',
    protected: true,
    permissions: ['admin:manage_organization'],
    body: {
      code: 'string',
      name: 'string',
      manager_id: 'uuid',
      capacity_m3: 'number',
    },
  },
  'GET /api/v1/organizations/:org_id/warehouses': {
    description: 'Obtener bodegas',
    protected: true,
    permissions: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AUDIT LOGS
  // ─────────────────────────────────────────────────────────────────────────
  'GET /api/v1/organizations/:org_id/audit-logs': {
    description: 'Obtener logs de auditoría',
    protected: true,
    permissions: ['admin:audit_logs'],
    query: {
      resource_type: 'string?',
      user_id: 'uuid?',
      action: 'string?',
      from_date: 'ISO8601?',
      to_date: 'ISO8601?',
      limit: 'number?',
    },
  },
  'GET /api/v1/organizations/:org_id/audit-logs/stats': {
    description: 'Obtener estadísticas de auditoría',
    protected: true,
    permissions: ['admin:audit_logs'],
  },
  'GET /api/v1/organizations/:org_id/audit-logs/anomalies': {
    description: 'Detectar anomalías',
    protected: true,
    permissions: ['admin:audit_logs'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PERMISSIONS
  // ─────────────────────────────────────────────────────────────────────────
  'GET /api/v1/permissions': {
    description: 'Obtener todos los permisos disponibles',
    protected: true,
    permissions: ['admin:manage_roles'],
  },
};

// =============================================================================
// EJEMPLO DE IMPLEMENTACIÓN - Cost Centers API
// =============================================================================

/*
// /app/api/v1/organizations/[org_id]/cost-centers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { createServerClient } from '@/lib/supabase/server';
import AuditTrailService from '@/lib/services/audittrail.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { org_id: string } }
) {
  // Proteger con RBAC
  const auth = await rbacMiddleware(request, {
    requiredPermissions: [{ resource: 'admin', action: 'manage_organization' }],
    requiresAuth: true,
  });

  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('organization_id', params.org_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[v0] Error fetching cost centers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { org_id: string } }
) {
  // Proteger con RBAC - Solo admins
  const auth = await rbacMiddleware(request, {
    requiredRoles: ['admin'],
    requiresAuth: true,
  });

  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Crear nuevo cost center
    const { data, error } = await supabase
      .from('cost_centers')
      .insert({
        organization_id: params.org_id,
        ...body,
        created_by: auth.user!.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar en audit trail
    await AuditTrailService.logAction({
      organizationId: params.org_id,
      userId: auth.user!.id,
      action: 'create',
      resourceType: 'cost_center',
      resourceId: data.id,
      newValues: data,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[v0] Error creating cost center:', error);

    // Log failed action
    await AuditTrailService.logFailedAction({
      organizationId: params.org_id,
      userId: auth.user?.id,
      action: 'create',
      resourceType: 'cost_center',
      errorMessage: String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
*/

// =============================================================================
// PATRONES DE IMPLEMENTACIÓN
// =============================================================================

/*
PATRÓN 1: Validar acceso a organización
────────────────────────────────────────
const access = await validateOrganizationAccess(request, params.org_id);
if (!access.isValid) {
  return authorizationError(access.error, access.statusCode);
}

PATRÓN 2: Verificar permiso específico
────────────────────────────────────────
const hasPermission = await RBACService.hasPermission(
  auth.user!.id,
  params.org_id,
  'documents',
  'create'
);

PATRÓN 3: Registrar acción en audit
────────────────────────────────────
await AuditTrailService.logAction({
  organizationId: params.org_id,
  userId: auth.user!.id,
  action: 'update',
  resourceType: 'contract',
  resourceId: contract.id,
  oldValues: oldContract,
  newValues: updatedContract,
});

PATRÓN 4: Validar datos antes de persistir
───────────────────────────────────────────
const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(3),
  manager_id: z.string().uuid().optional(),
});

const validated = schema.safeParse(body);
if (!validated.success) {
  return NextResponse.json({ errors: validated.error }, { status: 400 });
}
*/

export default FASE1_API_ROUTES;
