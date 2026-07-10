import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext, type AuthContext } from '@/lib/api/auth-session';

/**
 * Module access control based on the cargo (job position) x module matrix
 * defined by Sostenibilidad (see ROLES-INTRANET Excel).
 *
 * Access levels:
 *  - ED  (Editor-Revisor): read + write + approve
 *  - LEC (Lector): read only
 *  - SR  (Sin Rol): no access
 */

export type AccessLevel = 'ED' | 'LEC' | 'SR';

// Canonical module keys used across the app + role_matrix table.
export const MODULE_KEYS = {
  // HSEC modules
  HSE_KPLS: 'hse_kpls',
  HSE_DOCUMENTACION: 'hse_documentacion',
  HSE_EPP: 'hse_epp',
  HSE_INCIDENTE: 'hse_incidente',
  HSE_RIESGOS: 'hse_riesgos',
  HSE_INVESTIGACIONES: 'hse_investigaciones',
  HSE_CAPACITACIONES: 'hse_capacitaciones',
  HSE_TABLERO: 'hse_tablero',
  HSE_DOCUMENTOS_EXTRA: 'hse_documentos_extra',
  // Contratos actions
  CONTRATOS_SOLICITAR_LINK: 'contratos_solicitar_link',
  CONTRATOS_SUBIR_INFO: 'contratos_subir_info',
  CONTRATOS_APROBAR: 'contratos_aprobar',
  CONTRATOS_AUTORIZAR: 'contratos_autorizar',
  CONTRATOS_VISUALIZACION: 'contratos_visualizacion',
  // Sostenibilidad
  SOS_TABLERO: 'sos_tablero',
  SOS_MEDIO_AMBIENTE: 'sos_medio_ambiente',
  SOS_COMUNIDADES: 'sos_comunidades',
  SOS_DOCUMENTOS: 'sos_documentos',
  SOS_CALENDARIO: 'sos_calendario',
  // Mantenimiento
  MANT_OPERACIONES: 'mant_operaciones',
  MANT_GERENCIAL: 'mant_gerencial',
  MANT_RECURSOS: 'mant_recursos',
  MANT_DOCUMENTOS: 'mant_documentos',
  // Bodega
  BODEGA_INVENTARIO: 'bodega_inventario',
  BODEGA_DOCUMENTOS: 'bodega_documentos',
  // Finanzas
  FIN_COMPRAS: 'fin_compras',
  FIN_FINANZAS: 'fin_finanzas',
  FIN_REPORTES: 'fin_reportes',
  // Legal
  LEGAL_MODULO: 'legal_modulo',
  LEGAL_CONTRATOS: 'legal_contratos',
  LEGAL_EECC: 'legal_eecc',
  // Producción / Core
  PROD_OPERACIONES: 'prod_operaciones',
  PROD_TELEMETRIA: 'prod_telemetria',
  CORE_ALERTAS: 'core_alertas',
  CORE_CENTROS_COSTOS: 'core_centros_costos',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

// Roles that bypass the matrix entirely (full access everywhere).
const ADMIN_BYPASS_ROLES = new Set(['admin', 'superadmin', 'super_admin']);

export function isAdminRole(role?: string | null): boolean {
  return !!role && ADMIN_BYPASS_ROLES.has(role);
}

export type ModuleAccessMap = Record<string, AccessLevel>;

export interface UserModuleAccess {
  /** Whether the user has a cargo assigned. When false, matrix enforcement is skipped (legacy behavior). */
  hasCargo: boolean;
  access: ModuleAccessMap;
}

/**
 * Loads the full access map for a user based on their assigned cargo.
 * Returns hasCargo=false (and an empty map) if the user has no cargo assigned,
 * signalling callers to fall back to legacy role-based access instead of blocking.
 * Admins are handled by the caller (they bypass this).
 */
export async function getUserModuleAccess(userId: string): Promise<UserModuleAccess> {
  const supabase = getSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('cargo_id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.cargo_id) {
    return { hasCargo: false, access: {} };
  }

  const { data: rows } = await supabase
    .from('role_matrix')
    .select('module_key, access_level')
    .eq('cargo_id', profile.cargo_id);

  const map: ModuleAccessMap = {};
  for (const row of rows ?? []) {
    map[row.module_key as string] = row.access_level as AccessLevel;
  }
  return { hasCargo: true, access: map };
}

/**
 * Resolves the effective access level for a module.
 * - Admins always get 'ED'.
 * - Users without a cargo get 'ED' (unrestricted / legacy) so the matrix rollout
 *   does not break users who have not been assigned a cargo yet.
 * - Users with a cargo get their matrix level; missing entries default to 'SR'.
 */
export async function getModuleAccessLevel(
  userId: string,
  role: string | null | undefined,
  moduleKey: ModuleKey
): Promise<AccessLevel> {
  if (isAdminRole(role)) return 'ED';
  const { hasCargo, access } = await getUserModuleAccess(userId);
  if (!hasCargo) return 'ED';
  return access[moduleKey] ?? 'SR';
}

export type ModuleAccessResult =
  | {
      authorized: false;
      accessLevel: AccessLevel;
      canWrite: boolean;
      user: AuthContext['user'] | null;
      role: string | null;
      organizationId: string | null;
      response: NextResponse;
    }
  | {
      authorized: true;
      accessLevel: AccessLevel;
      canWrite: boolean;
      user: AuthContext['user'];
      role: string | null;
      organizationId: string | null;
      response: null;
    };

/**
 * API guard: enforce module access for a route.
 *
 * @param request       the incoming request
 * @param moduleKey     which module the route belongs to
 * @param requireWrite  if true, the user must have 'ED' (write). Otherwise 'LEC' is enough for reads.
 */
export async function requireModuleAccess(
  request: NextRequest,
  moduleKey: ModuleKey,
  requireWrite = false
): Promise<ModuleAccessResult> {
  const authContext = await resolveAuthContext(request);

  if (!authContext?.user) {
    return {
      authorized: false,
      accessLevel: 'SR',
      canWrite: false,
      user: null,
      role: null,
      organizationId: null,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  const role = authContext.role || null;
  const organizationId =
    authContext.organizationId || authContext.user.organization_id || null;

  const accessLevel = await getModuleAccessLevel(authContext.user.id, role, moduleKey);
  const canWrite = accessLevel === 'ED';
  const canRead = accessLevel === 'ED' || accessLevel === 'LEC';

  const allowed = requireWrite ? canWrite : canRead;

  if (!allowed) {
    const message =
      accessLevel === 'SR'
        ? 'No tienes acceso a este módulo'
        : 'No tienes permiso para realizar esta acción (solo lectura)';
    return {
      authorized: false,
      accessLevel,
      canWrite,
      user: authContext.user,
      role,
      organizationId,
      response: NextResponse.json({ error: message }, { status: 403 }),
    };
  }

  return {
    authorized: true,
    accessLevel,
    canWrite,
    user: authContext.user,
    role,
    organizationId,
    response: null,
  };
}
