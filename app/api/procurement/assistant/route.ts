export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { handleOperationalDomainAssistant } from '@/lib/intelligence/operational-domain-assistant';

async function handle(request: NextRequest) {
  const procurementAccess = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!procurementAccess.authorized) return procurementAccess.response;

  const inventoryAccess = await requireModuleAccess(request, MODULE_KEYS.BODEGA_INVENTARIO);
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  return handleOperationalDomainAssistant({
    request,
    context,
    domain: 'procurement',
    allowedDomains: inventoryAccess.authorized ? ['procurement', 'inventory'] : ['procurement'],
  });
}

export const GET = handle;
export const POST = handle;
