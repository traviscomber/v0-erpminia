// FASE 1: RBAC Middleware - Protección de rutas basada en permisos

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import RBACService from '@/lib/services/rbac.service';

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export interface ProtectRouteOptions {
  requiredPermissions?: Array<{ resource: string; action: string }>;
  requiredRoles?: string[];
  requiresAuth?: boolean;
  matchLogic?: 'AND' | 'OR'; // AND = todos los permisos, OR = cualquier permiso
}

/**
 * Middleware para proteger rutas API basado en RBAC
 * Uso en route.ts:
 * 
 * export async function GET(request: NextRequest) {
 *   const auth = await rbacMiddleware(request, {
 *     requiredPermissions: [{ resource: 'documents', action: 'read' }],
 *     requiresAuth: true,
 *   });
 * 
 *   if (!auth.isAuthorized) {
 *     return NextResponse.json({ error: auth.error }, { status: auth.statusCode });
 *   }
 * 
 *   // Tu lógica aquí...
 * }
 */
export async function rbacMiddleware(
  request: NextRequest,
  options: ProtectRouteOptions = {}
) {
  const {
    requiredPermissions = [],
    requiredRoles = [],
    requiresAuth = true,
    matchLogic = 'OR',
  } = options;

  try {
    // Obtener usuario autenticado
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        isAuthorized: false,
        error: 'Unauthorized',
        statusCode: 401,
        user: null,
      };
    }

    // Si solo requiere autenticación
    if (!requiredPermissions.length && !requiredRoles.length) {
      return {
        isAuthorized: true,
        error: null,
        statusCode: 200,
        user,
      };
    }

    // Obtener organization_id de headers o query
    const organizationId = request.headers.get('x-organization-id') ||
      request.nextUrl.searchParams.get('org_id');

    if (!organizationId) {
      return {
        isAuthorized: false,
        error: 'Organization ID required',
        statusCode: 400,
        user,
      };
    }

    // Verificar permisos
    if (requiredPermissions.length) {
      let hasPermission = false;

      if (matchLogic === 'AND') {
        hasPermission = await RBACService.hasAllPermissions(
          user.id,
          organizationId,
          requiredPermissions
        );
      } else {
        hasPermission = await RBACService.hasAnyPermission(
          user.id,
          organizationId,
          requiredPermissions
        );
      }

      if (!hasPermission) {
        return {
          isAuthorized: false,
          error: 'Insufficient permissions',
          statusCode: 403,
          user,
        };
      }
    }

    // Verificar roles
    if (requiredRoles.length) {
      const hasRole = await RBACService.hasRole(
        user.id,
        organizationId,
        requiredRoles
      );

      if (!hasRole) {
        return {
          isAuthorized: false,
          error: 'Insufficient role',
          statusCode: 403,
          user,
        };
      }
    }

    return {
      isAuthorized: true,
      error: null,
      statusCode: 200,
      user,
      organizationId,
    };
  } catch (error) {
    console.error('[v0] RBAC middleware error:', error);
    return {
      isAuthorized: false,
      error: 'Internal server error',
      statusCode: 500,
      user: null,
    };
  }
}

/**
 * Middleware para validar que el user_id en URL pertenece al usuario actual
 */
export async function validateUserOwnership(
  request: NextRequest,
  userIdFromUrl: string
) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isValid: false, error: 'Unauthorized', statusCode: 401 };
  }

  if (user.id !== userIdFromUrl) {
    return { isValid: false, error: 'Forbidden', statusCode: 403 };
  }

  return { isValid: true, error: null, statusCode: 200 };
}

/**
 * Middleware para validar que el organization_id pertenece al usuario
 */
export async function validateOrganizationAccess(
  request: NextRequest,
  organizationId: string
) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isValid: false, error: 'Unauthorized', statusCode: 401 };
  }

  try {
    // Verificar que el usuario tiene un rol en esta organización
    const { data } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .limit(1);

    if (!data || data.length === 0) {
      return { isValid: false, error: 'Forbidden', statusCode: 403 };
    }

    return { isValid: true, error: null, statusCode: 200 };
  } catch (error) {
    console.error('[v0] Organization access validation error:', error);
    return { isValid: false, error: 'Internal error', statusCode: 500 };
  }
}

/**
 * Helper para retornar errores de autorización estandarizados
 */
export function authorizationError(
  message: string,
  statusCode: number = 403
) {
  return NextResponse.json(
    { error: message },
    { status: statusCode }
  );
}
