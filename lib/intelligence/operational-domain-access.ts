import {
  MODULE_KEYS,
  getUserModuleAccess,
  isAdminRole,
  type AccessLevel,
  type ModuleKey,
} from '@/lib/api/module-access';
import type { OperationalAssistantDomain } from '@/lib/intelligence/operational-domain-assistant';

const OPERATIONAL_DOMAIN_MODULE_KEYS: Record<OperationalAssistantDomain, ModuleKey> = {
  inventory: MODULE_KEYS.BODEGA_INVENTARIO,
  procurement: MODULE_KEYS.FIN_COMPRAS,
  production: MODULE_KEYS.PROD_OPERACIONES,
  finance: MODULE_KEYS.FIN_FINANZAS,
};

const OPERATIONAL_DOMAIN_ORDER: OperationalAssistantDomain[] = [
  'inventory',
  'procurement',
  'production',
  'finance',
];

function canRead(accessLevel: AccessLevel | undefined) {
  return accessLevel === 'ED' || accessLevel === 'LEC';
}

export async function resolveAllowedOperationalDomains(args: {
  userId: string;
  role?: string | null;
  primaryDomain: OperationalAssistantDomain;
}): Promise<OperationalAssistantDomain[]> {
  const { userId, role, primaryDomain } = args;

  if (isAdminRole(role)) {
    return [
      primaryDomain,
      ...OPERATIONAL_DOMAIN_ORDER.filter((domain) => domain !== primaryDomain),
    ];
  }

  const { hasCargo, access } = await getUserModuleAccess(userId);
  if (!hasCargo) return [primaryDomain];

  const additionalDomains = OPERATIONAL_DOMAIN_ORDER.filter(
    (domain) =>
      domain !== primaryDomain && canRead(access[OPERATIONAL_DOMAIN_MODULE_KEYS[domain]]),
  );

  return [primaryDomain, ...additionalDomains];
}
