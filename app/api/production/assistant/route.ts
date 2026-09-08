export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { handlePersistentOperationalDomainAssistant } from '@/lib/intelligence/persistent-operational-domain-assistant';

async function handle(request: NextRequest) {
  const productionAccess = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!productionAccess.authorized) return productionAccess.response;

  const [inventoryAccess, procurementAccess] = await Promise.all([
    requireModuleAccess(request, MODULE_KEYS.BODEGA_INVENTARIO),
    requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS),
  ]);
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const allowedDomains = ['production'] as Array<'production' | 'inventory' | 'procurement'>;
  if (inventoryAccess.authorized) allowedDomains.push('inventory');
  if (procurementAccess.authorized) allowedDomains.push('procurement');

  return handlePersistentOperationalDomainAssistant({
    request,
    context,
    domain: 'production',
    allowedDomains,
  });
}

export const GET = handle;
export const POST = handle;
