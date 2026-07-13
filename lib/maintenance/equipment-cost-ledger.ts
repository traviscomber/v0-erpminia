import crypto from 'crypto';
import { repairCostCenterText } from '@/lib/cost-centers';

export type MaintenanceEquipmentAssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  model: string | null;
  manufacturer: string | null;
  status?: string | null;
  criticality?: string | null;
};

export type MaintenanceCostCenterRow = {
  id: string;
  code: string | null;
  name: string | null;
  description?: string | null;
  status?: string | null;
};

export type EquipmentCostSourceRow = {
  rowNumber: number;
  accountCode: string;
  accountName: string;
  documentNumber: string;
  documentType: string;
  costDate: string;
  month: string;
  year: number | null;
  detailConcept: string;
  amount: number;
  equipmentName: string;
  category: string;
  rut: string;
  rutName: string;
};

export type EquipmentCostMatch = {
  assetId: string | null;
  costCenterId: string | null;
  matchedBy: string | null;
  matchConfidence: number;
  machineFamily: string | null;
  assetCodeSnapshot: string | null;
  assetNameSnapshot: string | null;
  costCenterCodeSnapshot: string | null;
  costCenterNameSnapshot: string | null;
};

export type ParsedWorkbook = {
  sheetName: string;
  rows: EquipmentCostSourceRow[];
};

function normalizeLoose(value: unknown) {
  return repairCostCenterText(String(value ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function firstWord(value: string) {
  return normalizeLoose(value).split(' ')[0] || '';
}

export function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseDate(value: unknown) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const normalized = String(value).trim();
  if (!normalized) return '';
  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  return '';
}

export function normalizeEquipmentText(value: unknown) {
  return repairCostCenterText(String(value ?? '')).trim().replace(/\s+/g, ' ');
}

export function buildEquipmentCostSignature(row: EquipmentCostSourceRow) {
  return crypto
    .createHash('sha1')
    .update(
      [
        row.accountCode,
        row.documentNumber,
        row.costDate,
        row.equipmentName,
        row.category,
        row.detailConcept,
        String(row.amount || 0),
      ]
        .map((value) => normalizeLoose(value))
        .join('|'),
    )
    .digest('hex');
}

export function parseBaseSheetRows(rows: unknown[][]): EquipmentCostSourceRow[] {
  if (!rows.length) return [];

  const headerRow = rows[0] || [];
  const headerText = headerRow.map((value) => normalizeLoose(value));
  const looksLikeExpectedBase =
    headerText.length >= 10 &&
    headerText.some((header) => header.includes('cuenta')) &&
    headerText.some((header) => header.includes('costo')) &&
    headerText.some((header) => header.includes('equipo')) &&
    headerText.some((header) => header.includes('categoria'));

  const dataRows = rows.slice(1).filter((row) => row.some((value) => String(value ?? '').trim() !== ''));

  return dataRows.flatMap((row, index) => {
    const accountCode = normalizeLoose(row[0]) ? String(row[0] ?? '').trim() : '';
    const accountName = normalizeEquipmentText(row[1]);
    const documentNumber = normalizeEquipmentText(row[2]);
    const documentType = normalizeEquipmentText(row[3]);
    const costDate = parseDate(row[4]);
    const month = normalizeEquipmentText(row[5]);
    const year = Number(row[6]) || null;
    const detailConcept = normalizeEquipmentText(row[7]);
    const amount = parseNumber(row[8]);
    const equipmentName = normalizeEquipmentText(row[9]);
    const category = normalizeEquipmentText(row[10]);
    const rut = normalizeEquipmentText(row[11]);
    const rutName = normalizeEquipmentText(row[12]);

    if (!looksLikeExpectedBase && amount === 0 && !equipmentName && !detailConcept) {
      return [];
    }

    return [
      {
        rowNumber: index + 2,
        accountCode,
        accountName,
        documentNumber,
        documentType,
        costDate,
        month,
        year: Number.isFinite(year) ? year : null,
        detailConcept,
        amount,
        equipmentName,
        category,
        rut,
        rutName,
      },
    ];
  });
}

export function parseEquipmentCostWorkbook(rows: unknown[][], sheetName: string): ParsedWorkbook {
  return {
    sheetName,
    rows: parseBaseSheetRows(rows),
  };
}

function scoreTextMatch(source: string, target: string) {
  const normalizedSource = normalizeLoose(source);
  const normalizedTarget = normalizeLoose(target);
  if (!normalizedSource || !normalizedTarget) return 0;
  if (normalizedSource === normalizedTarget) return 1;
  if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) return 0.85;
  const sourceRoot = firstWord(normalizedSource);
  const targetRoot = firstWord(normalizedTarget);
  if (sourceRoot && targetRoot && sourceRoot === targetRoot) return 0.6;
  return 0;
}

export function matchEquipmentCostRow(
  row: EquipmentCostSourceRow,
  assets: MaintenanceEquipmentAssetRow[],
  costCenters: MaintenanceCostCenterRow[],
): EquipmentCostMatch {
  const equipmentText = [row.equipmentName, row.detailConcept, row.accountName, row.category].filter(Boolean).join(' ');
  const categoryText = row.category || row.accountName;

  let bestAsset: MaintenanceEquipmentAssetRow | null = null;
  let bestAssetScore = 0;

  for (const asset of assets) {
    const candidates = [
      asset.asset_code || '',
      asset.asset_name || '',
      asset.asset_type || '',
      asset.model || '',
      asset.manufacturer || '',
    ];

    const score = Math.max(
      ...candidates.map((candidate) => scoreTextMatch(equipmentText, candidate)),
      scoreTextMatch(equipmentText, asset.asset_code || ''),
    );

    if (score > bestAssetScore) {
      bestAsset = asset;
      bestAssetScore = score;
    }
  }

  let bestCostCenter: MaintenanceCostCenterRow | null = null;
  let bestCostCenterScore = 0;
  for (const costCenter of costCenters) {
    const score = Math.max(
      scoreTextMatch(categoryText, costCenter.name || ''),
      scoreTextMatch(categoryText, costCenter.code || ''),
      scoreTextMatch(equipmentText, costCenter.name || ''),
    );

    if (score > bestCostCenterScore) {
      bestCostCenter = costCenter;
      bestCostCenterScore = score;
    }
  }

  const machineFamily = bestAsset
    ? normalizeEquipmentText(bestAsset.asset_type || bestAsset.model || bestAsset.asset_name || '') || null
    : null;

  return {
    assetId: bestAsset?.id || null,
    costCenterId: bestCostCenter?.id || null,
    matchedBy: bestAssetScore >= 0.85 ? 'asset_name' : bestAssetScore >= 0.6 ? 'asset_family' : bestCostCenterScore >= 0.85 ? 'cost_center_name' : null,
    matchConfidence: Math.max(bestAssetScore, bestCostCenterScore, 0),
    machineFamily,
    assetCodeSnapshot: bestAsset?.asset_code || null,
    assetNameSnapshot: bestAsset?.asset_name || row.equipmentName || null,
    costCenterCodeSnapshot: bestCostCenter?.code || null,
    costCenterNameSnapshot: bestCostCenter?.name || row.category || null,
  };
}

export function toEquipmentCostDisplayLabel(value: unknown) {
  return normalizeEquipmentText(value);
}
