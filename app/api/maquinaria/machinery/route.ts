export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { deriveMachinesFromCostCenters, inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';
import { resolveTechnicalSheetReference } from '@/lib/maintenance/technical-sheet-library';

type CostCenterRow = {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string | null;
};

type MaintenanceAssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  model: string | null;
  asset_type?: string | null;
  status?: string | null;
};

type DerivedMachineRow = {
  id: string;
  asset_id: string | null;
  code: string;
  name: string;
  model: string;
  plate: string | null;
  year: number | null;
  category_code: string;
  category: string;
  status: string;
  source: 'cost_center' | 'maintenance_asset';
  description?: string | null;
  technical_sheet_reference: {
    brand?: string;
    model?: string;
    family?: string;
    sourceLabel?: string;
    sourceUrl?: string;
  } | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '').trim();
}

function normalizeLookup(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function stripPlate(value: string) {
  return value.replace(/\s*-\s*[A-Z0-9]{4,10}\s*$/, '').trim();
}

function familyToRootCode(family: string) {
  const normalized = normalizeText(family);
  if (normalized.includes('camioneta')) return '8';
  if (normalized.includes('camion de bajo perfil')) return '12';
  if (normalized.includes('camion')) return '9';
  if (normalized.includes('cargador frontal')) return '11';
  if (normalized.includes('cargador de bajo perfil') || normalized.includes('cargadores de bajo perfil')) return '10';
  if (normalized.includes('grupo generador')) return '13';
  if (normalized.includes('compresor')) return '14';
  if (normalized.includes('manipulador telescopico')) return '15';
  if (normalized.includes('equipo de sondaje')) return '16';
  if (normalized.includes('equipo de perforacion')) return '17';
  if (normalized.includes('minicargador')) return '18';
  if (normalized.includes('excavadora')) return '19';
  if (normalized.includes('planta')) return '4';
  if (normalized.includes('proyecto')) return '7';
  return '20';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { searchParams } = new URL(request.url);
  const search = normalizeLookup(searchParams.get('search'));
  const category = normalizeText(searchParams.get('category'));

  try {
    const [{ data: costCentersRaw, error: costCentersError }, { data: assetsRaw, error: assetsError }] = await Promise.all([
      context.supabase
        .from('cost_centers')
        .select('id, code, name, description, status')
        .eq('organization_id', context.organizationId)
        .order('code', { ascending: true }),
      context.supabase
        .from('maintenance_assets')
        .select('id, asset_code, asset_name, model')
        .eq('organization_id', context.organizationId),
    ]);

    if (costCentersError) throw costCentersError;
    if (assetsError) throw assetsError;

    const costCenters = Array.isArray(costCentersRaw)
      ? (costCentersRaw as CostCenterRow[]).flatMap((center) => {
          const code = normalizeText(center.code);
          const name = normalizeText(center.name);
          if (!code || !name) return [];
          return [
            {
              id: center.id,
              code,
              name,
              description: center.description || null,
              status: center.status || null,
            },
          ];
        })
      : [];

    const maintenanceAssets = Array.isArray(assetsRaw) ? (assetsRaw as MaintenanceAssetRow[]) : [];
    const assetByCode = new Map<string, string>();
    const assetByName = new Map<string, string>();
    const assetByModel = new Map<string, string>();

    for (const asset of maintenanceAssets) {
      const assetCode = normalizeLookup(asset.asset_code);
      const assetName = normalizeLookup(asset.asset_name);
      const assetModel = normalizeLookup(asset.model);
      if (assetCode && !assetByCode.has(assetCode)) assetByCode.set(assetCode, asset.id);
      if (assetName && !assetByName.has(assetName)) assetByName.set(assetName, asset.id);
      if (assetModel && !assetByModel.has(assetModel)) assetByModel.set(assetModel, asset.id);
    }

    const derived = deriveMachinesFromCostCenters(costCenters);
    const machineRows: DerivedMachineRow[] = derived
      .filter((machine) => {
        if (!search) return true;
        return (
          normalizeLookup(machine.code).includes(search) ||
          normalizeLookup(machine.name).includes(search) ||
          normalizeLookup(machine.family).includes(search) ||
          normalizeLookup(machine.rootCode).includes(search)
        );
      })
      .filter((machine) => {
        if (!category) return true;
        return machine.rootCode === category || normalizeLookup(machine.family) === normalizeLookup(category);
      })
      .map((machine): DerivedMachineRow => {
        const cleanName = stripPlate(machine.name);
        const assetId =
          assetByCode.get(normalizeLookup(machine.code)) ||
          assetByName.get(normalizeLookup(machine.name)) ||
          assetByName.get(normalizeLookup(cleanName)) ||
          assetByModel.get(normalizeLookup(cleanName));

        const yearMatch = machine.name.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? Number.parseInt(yearMatch[0], 10) : null;
        const plateMatch = machine.name.match(/\s-\s*([A-Z0-9]{4,10})\s*$/);
        const plate = plateMatch ? plateMatch[1] : null;
        const model = cleanName.replace(/\s*\b(19|20)\d{2}\b.*$/, '').trim();
        const referenceSheet = resolveTechnicalSheetReference(`${machine.name} ${model} ${machine.family}`, machine.family);

        return {
          id: machine.id,
          asset_id: assetId || null,
          code: machine.code,
          name: machine.name,
          model,
          plate,
          year,
          category_code: machine.rootCode,
          category: machine.family,
          status: machine.status,
          source: 'cost_center' as const,
          description: machine.description || null,
          technical_sheet_reference: referenceSheet
            ? {
                brand: referenceSheet.brand,
                model: referenceSheet.model,
                family: referenceSheet.family,
                sourceLabel: referenceSheet.sourceLabel,
                sourceUrl: referenceSheet.sourceUrl,
              }
            : null,
        };
      })
      .filter((item) => item.code.length > 0 && item.name.length > 0);

    const derivedKeys = new Set(
      machineRows.flatMap((item) => [normalizeLookup(item.code), normalizeLookup(item.name), item.asset_id || '']).filter(Boolean)
    );

    const assetFallbackRows: DerivedMachineRow[] = maintenanceAssets
      .map((asset): DerivedMachineRow | null => {
        const assetName = normalizeText(asset.asset_name || asset.asset_code || asset.model || '');
        const assetCode = normalizeText(asset.asset_code || asset.id);
        if (!assetName && !assetCode) return null;

        const family = inferMachineFamilyFromText(
          `${asset.asset_type || ''} ${assetName} ${asset.model || ''} ${asset.asset_code || ''}`
        ) || 'Otros Equipos';
        const rootCode = familyToRootCode(family);
        const technicalSheetReference = resolveTechnicalSheetReference(
          `${assetName} ${asset.model || ''} ${asset.asset_type || ''}`,
          family
        );

        return {
          id: asset.id,
          asset_id: asset.id,
          code: assetCode,
          name: assetName || assetCode,
          model: normalizeText(asset.model || assetName || assetCode),
          plate: null,
          year: null,
          category_code: rootCode,
          category: family,
          status: asset.status || 'activo',
          source: 'maintenance_asset' as const,
          description: null,
          technical_sheet_reference: technicalSheetReference
            ? {
                brand: technicalSheetReference.brand,
                model: technicalSheetReference.model,
                family: technicalSheetReference.family,
                sourceLabel: technicalSheetReference.sourceLabel,
                sourceUrl: technicalSheetReference.sourceUrl,
              }
            : null,
        };
      })
      .filter((item): item is DerivedMachineRow => item !== null)
      .filter((item) => !derivedKeys.has(normalizeLookup(item.code)) && !derivedKeys.has(normalizeLookup(item.name)));

    const machinery = [...machineRows, ...assetFallbackRows];

    const categoryMap = new Map<string, { code: string; name: string; count: number }>();
    for (const machine of machinery) {
      const current = categoryMap.get(machine.category_code) || { code: machine.category_code, name: machine.category, count: 0 };
      current.count += 1;
      categoryMap.set(machine.category_code, current);
    }

    const categories = Array.from(categoryMap.values()).sort((a, b) =>
      a.code.localeCompare(b.code, 'es', { numeric: true, sensitivity: 'base' }),
    );

    return NextResponse.json({
      machinery,
      categories,
      total: machinery.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching machinery';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}