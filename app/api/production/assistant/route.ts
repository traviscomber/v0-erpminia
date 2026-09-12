export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { resolveAllowedOperationalDomains } from '@/lib/intelligence/operational-domain-access';
import { handlePersistentOperationalDomainAssistant } from '@/lib/intelligence/persistent-operational-domain-assistant';

async function handle(request: NextRequest) {
  const productionAccess = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!productionAccess.authorized) return productionAccess.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const allowedDomains = await resolveAllowedOperationalDomains({
    userId: productionAccess.user.id,
    role: productionAccess.role,
    primaryDomain: 'production',
  });

  return handlePersistentOperationalDomainAssistant({
    request,
    context,
    domain: 'production',
    allowedDomains,
  });
}

export const GET = handle;
export const POST = handle;
