export interface CostCenterRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive';
}

const COLLATOR = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const ROOT_PRIORITY = [
  '01',
  '02',
  '03',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
];
const ROOT_PRIORITY_INDEX = new Map(ROOT_PRIORITY.map((code, index) => [code, index]));

function normalizeCode(code: string) {
  return String(code || '').trim();
}

export function getCostCenterDepth(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return 0;
  return normalized.split('-').filter(Boolean).length - 1;
}

export function isRootCostCenter(code: string) {
  return getCostCenterDepth(code) === 0;
}

export function getCostCenterRootCode(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized.includes('-')) return normalized;
  return normalized.split('-')[0] || normalized;
}

export function isVisibleCostCenter(code: string) {
  const normalized = normalizeCode(code);
  return /^[0-9]/.test(normalized);
}

export function getCostCenterPriority(code: string) {
  const rootCode = getCostCenterRootCode(code);
  const priority = ROOT_PRIORITY_INDEX.get(rootCode);
  return typeof priority === 'number' ? priority : Number.MAX_SAFE_INTEGER;
}

export function formatCostCenterLabel(costCenter: Pick<CostCenterRecord, 'code' | 'name'>) {
  return `${costCenter.code} - ${costCenter.name}`;
}

export function sortCostCenters<T extends Pick<CostCenterRecord, 'code' | 'name'>>(costCenters: T[]) {
  return [...costCenters].sort((a, b) => {
    const aPriority = getCostCenterPriority(a.code);
    const bPriority = getCostCenterPriority(b.code);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aRoot = getCostCenterRootCode(a.code);
    const bRoot = getCostCenterRootCode(b.code);

    if (aRoot !== bRoot) {
      return COLLATOR.compare(aRoot, bRoot);
    }

    const depthDiff = getCostCenterDepth(a.code) - getCostCenterDepth(b.code);
    if (depthDiff !== 0) return depthDiff;

    const codeCompare = COLLATOR.compare(String(a.code || ''), String(b.code || ''));
    if (codeCompare !== 0) return codeCompare;

    return COLLATOR.compare(String(a.name || ''), String(b.name || ''));
  });
}
