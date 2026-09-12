export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { resolveAllowedOperationalDomains } from '@/lib/intelligence/operational-domain-access';
import { handlePersistentOperationalDomainAssistant } from '@/lib/intelligence/persistent-operational-domain-assistant';

async function handle(request: NextRequest) {
  const inventoryAccess = await requireModuleAccess(request, MODULE_KEYS.BODEGA_INVENTARIO);
  if (!inventoryAccess.authorized) return inventoryAccess.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const allowedDomains = await resolveAllowedOperationalDomains({
    userId: inventoryAccess.user.id,
    role: inventoryAccess.role,
    primaryDomain: 'inventory',
  });

  return handlePersistentOperationalDomainAssistant({
    request,
    context,
    domain: 'inventory',
    allowedDomains,
  });
}

export const GET = handle;
export const POST = handle;
