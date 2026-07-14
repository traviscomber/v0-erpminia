export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getRedistributableMachineAssignment } from '@/lib/maintenance/cost-center-machines';
import { isActiveCostCenterStatus } from '@/lib/cost-centers';

const MACHINERY_GROUPS: Record<string, string> = {
  '8': 'Camionetas',
  '9': 'Camiones',
  '10': 'Cargadores de Bajo Perfil',
  '11': 'Cargadores Frontales',
  '12': 'Camiones de Bajo Perfil',
  '13': 'Grupos Generadores',
  '14': 'Compresores',
  '15': 'Manipuladores Telescopicos',
  '16': 'Equipos de Sondaje',
  '17': 'Equipos de Perforacion',
  '18': 'Minicargadores',
  '19': 'Excavadoras',
  '20': 'Otros Equipos',
};

const MACHINERY_PARENT_CODES = Object.keys(MACHINERY_GROUPS);

type CostCenterRow = {
  code: string | null;
  name: string | null;
  status: string | null;
};

type MaintenanceAssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  model: string | null;
};

type MachineryRow = {
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

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { searchParams } = new URL(request.url);
  const search = normalizeLookup(searchParams.get('search'));
  const category = normalizeText(searchParams.get('category'));

  try {
    const [{ data, error }, { data: assets, error: assetsError }] = await Promise.all([
      context.supabase
        .from('cost_centers')
        .select('code, name, status')
        .like('code', '%-%')
        .order('code'),
      context.supabase
        .from('maintenance_assets')
        .select('id, asset_code, asset_name, model')
        .eq('organization_id', context.organizationId),
    ]);

    if (error) throw error;
    if (assetsError) throw assetsError;

    const rows = Array.isArray(data) ? (data as CostCenterRow[]) : [];
    const maintenanceAssets = Array.isArray(assets) ? (assets as MaintenanceAssetRow[]) : [];

    const assetByCode = new Map<string, string>();
    const assetByName = new Map<string, string>();
    const assetByModel = new Map<string, string>();

    maintenanceAssets.forEach((asset) => {
      const assetCode = normalizeLookup(asset.asset_code);
      const assetName = normalizeLookup(asset.asset_name);
      const assetModel = normalizeLookup(asset.model);
      if (assetCode && !assetByCode.has(assetCode)) assetByCode.set(assetCode, asset.id);
      if (assetName && !assetByName.has(assetName)) assetByName.set(assetName, asset.id);
      if (assetModel && !assetByModel.has(assetModel)) assetByModel.set(assetModel, asset.id);
    });

    let machines = rows.filter((row) => {
      const code = normalizeText(row.code);
      const parentCode = code.split('-')[0];
      return MACHINERY_PARENT_CODES.includes(parentCode) || !!getRedistributableMachineAssignment(code);
    });

    if (search) {
      machines = machines.filter((row) => {
        const name = normalizeLookup(row.name);
        const code = normalizeLookup(row.code);
        return name.includes(search) || code.includes(search);
      });
    }

    if (category && MACHINERY_PARENT_CODES.includes(category)) {
      machines = machines.filter((row) => normalizeText(row.code).split('-')[0] === category);
    }

    const machinery: MachineryRow[] = machines
      .map((row) => {
        const code = normalizeText(row.code);
        const name = normalizeText(row.name);
        const override = getRedistributableMachineAssignment(code);
        const parentCode = override?.rootCode || code.split('-')[0];
        const categoryName = override?.family || MACHINERY_GROUPS[parentCode] || 'Maquinaria';
        const cleanName = stripPlate(name);
        const assetId =
          assetByCode.get(normalizeLookup(code)) ||
          assetByName.get(normalizeLookup(name)) ||
          assetByName.get(normalizeLookup(cleanName)) ||
          assetByModel.get(normalizeLookup(cleanName));

        const yearMatch = name.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? Number.parseInt(yearMatch[0], 10) : null;

        const plateMatch = name.match(/\s-\s*([A-Z0-9]{4,10})\s*$/);
        const plate = plateMatch ? plateMatch[1] : null;

        const model = cleanName.replace(/\s*\b(19|20)\d{2}\b.*$/, '').trim();

        return {
          id: code,
          asset_id: assetId || null,
          code,
          name,
          model,
          plate,
          year,
          category_code: parentCode,
          category: categoryName,
          status: isActiveCostCenterStatus(row.status) ? 'Activo' : 'Inactivo',
        };
      })
      .filter((item) => item.code.length > 0 && item.name.length > 0);

    const categories = MACHINERY_PARENT_CODES.map((code) => ({
      code,
      name: MACHINERY_GROUPS[code],
      count: machinery.filter((m) => m.category_code === code).length,
    })).filter((c) => c.count > 0);

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
