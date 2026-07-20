import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { deriveMachinesFromCostCenters, inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';

type CostCenterRow = {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string | null;
};

type AssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  model: string | null;
  serial_number: string | null;
  status: string | null;
  criticality: string | null;
  purchase_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  specs: Record<string, unknown> | null;
};

type DerivedEquipmentRow = {
  id: string;
  asset_id: string | null;
  source: 'maintenance_asset' | 'cost_center';
  code: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  type: string;
  status: string;
  criticality: string;
  purchase_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  specs: Record<string, unknown> | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeStatus(status: string | null | undefined) {
  const value = String(status || '').toLowerCase();
  if (['active', 'operational', 'operativo', 'activo'].includes(value)) return 'Activo';
  if (['maintenance', 'mantenimiento'].includes(value)) return 'Mantenimiento';
  if (['inactive', 'inactivo', 'offline', 'fuera de servicio'].includes(value)) return 'Inactivo';
  return status ? String(status) : 'Activo';
}

function normalizeCriticality(criticality: string | null | undefined) {
  const value = String(criticality || '').toLowerCase();
  if (['critical', 'critica', 'crítica', 'critico', 'crítico'].includes(value)) return 'Crítica';
  if (['high', 'alta'].includes(value)) return 'Alta';
  if (['medium', 'media'].includes(value)) return 'Media';
  return criticality ? String(criticality) : 'Media';
}

function mapCriticalityFromFamily(family: string) {
  const normalized = normalizeText(family);
  if (normalized.includes('perforacion') || normalized.includes('sondaje') || normalized.includes('excavadora')) return 'Alta';
  if (normalized.includes('camion') || normalized.includes('cargador') || normalized.includes('compresor')) return 'Media';
  return 'Media';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: assets, error } = await context.supabase
      .from('maintenance_assets')
      .select('id, asset_code, asset_name, asset_type, model, serial_number, status, criticality, purchase_date, last_maintenance, next_maintenance, specs')
      .eq('organization_id', context.organizationId)
      .order('asset_name', { ascending: true });

    const { data: costCentersRaw, error: costCentersError } = await context.supabase
      .from('cost_centers')
      .select('id, code, name, description, status')
      .eq('organization_id', context.organizationId)
      .order('code', { ascending: true });

    if (error) {
      console.log('[v0] Maintenance equipment fetch error:', error);
      throw error;
    }

    if (costCentersError) {
      console.log('[v0] Cost center fetch error for equipment:', costCentersError);
      throw costCentersError;
    }

    const assetRows = Array.isArray(assets) ? (assets as AssetRow[]) : [];
    const assetIndex = new Set(
      assetRows.flatMap((asset) => [normalizeText(asset.asset_code), normalizeText(asset.asset_name), normalizeText(asset.model)]).filter(Boolean),
    );

    const equipmentFromAssets = assetRows.map((asset: AssetRow) => ({
        id: asset.id,
        asset_id: asset.id,
        source: 'maintenance_asset' as const,
        code: asset.asset_code || '',
        name: asset.asset_name || '',
        model: asset.model || null,
        serial_number: asset.serial_number || null,
        type: asset.asset_type || 'Activo',
        status: normalizeStatus(asset.status),
        criticality: normalizeCriticality(asset.criticality),
        purchase_date: asset.purchase_date || null,
        last_maintenance: asset.last_maintenance || null,
        next_maintenance: asset.next_maintenance || null,
        specs: asset.specs || null,
      }));

    const costCenters = Array.isArray(costCentersRaw)
      ? (costCentersRaw as CostCenterRow[]).flatMap((center) => {
          const code = String(center.code || '').trim();
          const name = String(center.name || '').trim();
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

    const derivedEquipment = deriveMachinesFromCostCenters(costCenters)
      .filter((machine) => !assetIndex.has(normalizeText(machine.code)) && !assetIndex.has(normalizeText(machine.name)))
      .map<DerivedEquipmentRow>((machine) => ({
        id: machine.id,
        asset_id: null,
        source: 'cost_center',
        code: machine.code,
        name: machine.name,
        model: machine.name,
        serial_number: null,
        type: machine.family,
        status: normalizeStatus(machine.status),
        criticality: mapCriticalityFromFamily(machine.family),
        purchase_date: null,
        last_maintenance: null,
        next_maintenance: null,
        specs: {
          source: 'cost_center',
          family: machine.family,
          root_code: machine.rootCode,
          description: machine.description || null,
        },
      }));

    const equipment = [...equipmentFromAssets, ...derivedEquipment];

    return NextResponse.json({
      equipment,
      total: equipment.length,
      source: 'maintenance_assets_and_cost_centers',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los equipos de mantenimiento';
    console.error('[v0] Maintenance equipment API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
