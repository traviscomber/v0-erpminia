export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { resolveAllowedOperationalDomains } from '@/lib/intelligence/operational-domain-access';
import { handlePersistentOperationalDomainAssistant } from '@/lib/intelligence/persistent-operational-domain-assistant';

async function handle(request: NextRequest) {
  const procurementAccess = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!procurementAccess.authorized) return procurementAccess.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const allowedDomains = await resolveAllowedOperationalDomains({
    userId: procurementAccess.user.id,
    role: procurementAccess.role,
    primaryDomain: 'procurement',
  });

  return handlePersistentOperationalDomainAssistant({
    request,
    context,
    domain: 'procurement',
    allowedDomains,
  });
}

export const GET = handle;
export const POST = handle;
