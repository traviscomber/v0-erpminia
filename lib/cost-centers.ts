export interface CostCenterRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive';
}

const COLLATOR = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

export function getCostCenterDepth(code: string) {
  const normalized = String(code || '').trim();
  if (!normalized) return 0;
  return normalized.split('-').filter(Boolean).length - 1;
}

export function isRootCostCenter(code: string) {
  return getCostCenterDepth(code) === 0;
}

export function getCostCenterRootCode(code: string) {
  const normalized = String(code || '').trim();
  if (!normalized.includes('-')) return normalized;
  return normalized.split('-')[0] || normalized;
}

export function formatCostCenterLabel(costCenter: Pick<CostCenterRecord, 'code' | 'name'>) {
  return `${costCenter.code} - ${costCenter.name}`;
}

export function sortCostCenters<T extends Pick<CostCenterRecord, 'code' | 'name'>>(costCenters: T[]) {
  return [...costCenters].sort((a, b) => {
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
