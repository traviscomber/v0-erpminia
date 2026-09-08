import { NextRequest, NextResponse } from 'next/server';
import { MODULE_KEYS, isAdminRole, requireModuleAccess } from '@/lib/api/module-access';

export type DocumentDomain = 'hse' | 'legal' | 'maintenance' | 'inventory';

export async function resolveDocumentAccess(request: NextRequest) {
  const [hsePrimary, hseExtra, contractView, legalModule, legalContracts, maintenance, inventory] = await Promise.all([
    requireModuleAccess(request, MODULE_KEYS.HSE_DOCUMENTACION),
    requireModuleAccess(request, MODULE_KEYS.HSE_DOCUMENTOS_EXTRA),
    requireModuleAccess(request, MODULE_KEYS.CONTRATOS_VISUALIZACION),
    requireModuleAccess(request, MODULE_KEYS.LEGAL_MODULO),
    requireModuleAccess(request, MODULE_KEYS.LEGAL_CONTRATOS),
    requireModuleAccess(request, MODULE_KEYS.MANT_DOCUMENTOS),
    requireModuleAccess(request, MODULE_KEYS.BODEGA_DOCUMENTOS),
  ]);

  const first = [hsePrimary, hseExtra, contractView, legalModule, legalContracts, maintenance, inventory]
    .find((result) => result.user);
  if (!first?.user) {
    return { ok: false as const, response: first?.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }

  const admin = isAdminRole(first.role);
  const domains: DocumentDomain[] = [];
  if (admin || hsePrimary.authorized || hseExtra.authorized) domains.push('hse');
  if (admin || contractView.authorized || legalModule.authorized || legalContracts.authorized) domains.push('legal');
  if (admin || maintenance.authorized) domains.push('maintenance');
  if (admin || inventory.authorized) domains.push('inventory');

  if (!domains.length) {
    return { ok: false as const, response: NextResponse.json({ error: 'No tienes acceso a dominios documentales' }, { status: 403 }) };
  }

  return {
    ok: true as const,
    admin,
    role: first.role,
    domains,
    canRead: (domain: DocumentDomain) => admin || domains.includes(domain),
  };
}
