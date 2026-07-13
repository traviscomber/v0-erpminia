import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

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

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: assets, error } = await context.supabase
      .from('maintenance_assets')
      .select('id, asset_code, asset_name, asset_type, model, serial_number, status, criticality, purchase_date, last_maintenance, next_maintenance, specs')
      .eq('organization_id', context.organizationId)
      .order('asset_name', { ascending: true });

    if (error) {
      console.log('[v0] Maintenance equipment fetch error:', error);
      throw error;
    }

    return NextResponse.json({
      equipment: (assets || []).map((asset: AssetRow) => ({
        id: asset.id,
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
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los equipos de mantenimiento';
    console.error('[v0] Maintenance equipment API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
