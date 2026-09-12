export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { resolveAllowedOperationalDomains } from '@/lib/intelligence/operational-domain-access';
import { handlePersistentOperationalDomainAssistant } from '@/lib/intelligence/persistent-operational-domain-assistant';

async function handle(request: NextRequest) {
  const financeAccess = await requireModuleAccess(request, MODULE_KEYS.FIN_FINANZAS);
  if (!financeAccess.authorized) return financeAccess.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const allowedDomains = await resolveAllowedOperationalDomains({
    userId: financeAccess.user.id,
    role: financeAccess.role,
    primaryDomain: 'finance',
  });

  return handlePersistentOperationalDomainAssistant({
    request,
    context,
    domain: 'finance',
    allowedDomains,
  });
}

export const GET = handle;
export const POST = handle;
