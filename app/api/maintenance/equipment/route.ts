import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type AssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  location: string | null;
  status: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  expected_lifespan_years: number | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  criticality: string | null;
  mtbf_hours: number | null;
};

function normalizeStatus(status: string | null | undefined) {
  const value = String(status || '').trim().toLowerCase();
  if (['active', 'operational', 'operativo', 'activo'].includes(value)) return 'Activo';
  if (['maintenance', 'mantenimiento'].includes(value)) return 'Mantenimiento';
  if (['inactive', 'inactivo', 'offline', 'fuera de servicio'].includes(value)) return 'Inactivo';
  return status ? String(status) : 'Activo';
}

function normalizeCriticality(criticality: string | null | undefined) {
  const value = String(criticality || '').trim().toLowerCase();
  if (['critical', 'critica', 'crítica', 'critico', 'crítico'].includes(value)) return 'Crítica';
  if (['high', 'alta', 'alto'].includes(value)) return 'Alta';
  if (['medium', 'media', 'medio'].includes(value)) return 'Media';
  if (['low', 'baja', 'bajo'].includes(value)) return 'Baja';
  return criticality ? String(criticality) : 'Media';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('maintenance_assets')
      .select(
        'id, asset_code, asset_name, asset_type, location, status, acquisition_date, acquisition_cost, expected_lifespan_years, manufacturer, model, serial_number, criticality, mtbf_hours',
      )
      .eq('organization_id', context.organizationId)
      .order('asset_name', { ascending: true });

    if (error) throw error;

    const rows = Array.isArray(data) ? (data as AssetRow[]) : [];
    const equipment = rows.map((asset) => ({
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
      purchase_date: asset.acquisition_date || null,
      last_maintenance: null,
      next_maintenance: null,
      specs: {
        manufacturer: asset.manufacturer,
        location: asset.location,
        acquisition_cost: asset.acquisition_cost,
        expected_lifespan_years: asset.expected_lifespan_years,
        mtbf_hours: asset.mtbf_hours,
      },
    }));

    return NextResponse.json({
      equipment,
      total: equipment.length,
      source: 'maintenance_assets',
      canonical: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los activos de mantenimiento';
    console.error('[assets] Canonical asset API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
