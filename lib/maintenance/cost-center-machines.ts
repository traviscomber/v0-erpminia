import { getCostCenterRootCode, repairCostCenterText } from '@/lib/cost-centers';

const MACHINE_KEYWORDS = [
  'hilux',
  'terrano',
  'ford cargo',
  'f-150',
  'mitsubishi',
  'chevrolet',
  'volkswagen',
  'auman',
  'foton',
  'amarok',
  'frontier',
  'volvo',
  'cargador',
  'scoop',
  'dumper',
  'camion',
  'camioneta',
  'compresor',
  'molino',
  'atlas copco',
  'cat ',
  'caterpillar',
  'bus',
  'bomba',
  'excavadora',
  'retroexcavadora',
  'sonda',
  'sondaje',
  'jumb',
  'generador',
  'electrogeno',
];

const MACHINE_ROOT_CODES = new Set(['3', '4', '7', '8', '9', '10', '11', '12']);

function normalize(value: string) {
  return repairCostCenterText(value).toLowerCase();
}

function looksLikeMachine(name: string) {
  const normalized = normalize(name);
  return MACHINE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export type DerivedCostCenterMachine = {
  id: string;
  code: string;
  name: string;
  family: string;
  rootCode: string;
  status: string;
  source: 'cost_center';
  description?: string | null;
};

export function deriveMachinesFromCostCenters(costCenters: Array<{ id: string; code: string; name: string; description?: string | null; status?: string | null }>) {
  const centers = costCenters
    .filter((center) => String(center.status || 'active').toLowerCase() === 'active')
    .filter((center) => {
      const name = repairCostCenterText(center.name || '');
      const code = String(center.code || '');
      const rootCode = getCostCenterRootCode(code);
      return (
        looksLikeMachine(name) ||
        (code.includes('-') && MACHINE_ROOT_CODES.has(rootCode))
      );
    });

  const rootNames = new Map<string, string>();
  for (const center of costCenters) {
    const rootCode = getCostCenterRootCode(center.code);
    if (!rootNames.has(rootCode) && !String(center.code || '').includes('-')) {
      rootNames.set(rootCode, repairCostCenterText(center.name || rootCode));
    }
  }

  const machines: DerivedCostCenterMachine[] = centers.map((center) => {
    const rootCode = getCostCenterRootCode(center.code);
    const family = rootNames.get(rootCode) || rootCode;
    return {
      id: center.id,
      code: String(center.code || ''),
      name: repairCostCenterText(center.name || ''),
      family,
      rootCode,
      status: String(center.status || 'active'),
      source: 'cost_center',
      description: center.description || null,
    };
  });

  return machines.sort((a, b) => {
    const familyCompare = a.family.localeCompare(b.family, 'es', { sensitivity: 'base' });
    if (familyCompare !== 0) return familyCompare;
    return a.code.localeCompare(b.code, 'es', { numeric: true, sensitivity: 'base' });
  });
}
