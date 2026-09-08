import { NextRequest, NextResponse } from 'next/server';
import { MODULE_KEYS, isAdminRole, requireModuleAccess } from '@/lib/api/module-access';

export type ExecutiveDomain = 'production' | 'maintenance' | 'inventory' | 'procurement' | 'finance';

const DOMAIN_MODULES = {
  production: MODULE_KEYS.PROD_OPERACIONES,
  maintenance: MODULE_KEYS.MANT_GERENCIAL,
  inventory: MODULE_KEYS.BODEGA_INVENTARIO,
  procurement: MODULE_KEYS.FIN_COMPRAS,
  finance: MODULE_KEYS.FIN_FINANZAS,
} as const;

export async function resolveExecutiveAccess(request: NextRequest) {
  const entries = await Promise.all(
    (Object.entries(DOMAIN_MODULES) as Array<[ExecutiveDomain, (typeof DOMAIN_MODULES)[ExecutiveDomain]]>)
      .map(async ([domain, moduleKey]) => [domain, await requireModuleAccess(request, moduleKey)] as const),
  );

  const first = entries.find(([, result]) => result.user)?.[1];
  if (!first?.user) {
    return {
      ok: false as const,
      response: first?.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  const admin = isAdminRole(first.role);
  const domains = entries.filter(([, result]) => result.authorized).map(([domain]) => domain);
  if (!domains.length && !admin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'No tienes acceso a dominios del Centro Ejecutivo' }, { status: 403 }),
    };
  }

  const effectiveDomains = admin ? (Object.keys(DOMAIN_MODULES) as ExecutiveDomain[]) : domains;
  return {
    ok: true as const,
    user: first.user,
    role: first.role,
    organizationId: first.organizationId,
    admin,
    domains: effectiveDomains,
    canRead: (domain: ExecutiveDomain) => effectiveDomains.includes(domain),
  };
}
