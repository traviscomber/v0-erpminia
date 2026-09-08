export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { handleOperationalDomainAssistant } from '@/lib/intelligence/operational-domain-assistant';

async function handle(request: NextRequest) {
  const inventoryAccess = await requireModuleAccess(request, MODULE_KEYS.BODEGA_INVENTARIO);
  if (!inventoryAccess.authorized) return inventoryAccess.response;

  const procurementAccess = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  return handleOperationalDomainAssistant({
    request,
    context,
    domain: 'inventory',
    allowedDomains: procurementAccess.authorized ? ['inventory', 'procurement'] : ['inventory'],
  });
}

export const GET = handle;
export const POST = handle;
