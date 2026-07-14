export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('asset_technical_sheets')
      .select(
        `
          id,
          model_name,
          brand_name,
          source_url,
          source_type,
          source_version,
          validated,
          validated_at,
          updated_at,
          asset:maintenance_assets(
            id,
            asset_code,
            asset_name,
            asset_type,
            model,
            manufacturer,
            criticality,
            status
          )
        `,
      )
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const ids = (Array.isArray(data) ? data : []).map((row) => row.id);
    const [componentsResult, faultsResult] = ids.length
      ? await Promise.all([
          context.supabase.from('asset_components').select('id, technical_sheet_id').eq('organization_id', context.organizationId),
          context.supabase.from('asset_component_fault_modes').select('id, asset_component_id').eq('organization_id', context.organizationId),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    const componentsBySheet = new Map<string, number>();
    const faultsBySheet = new Map<string, number>();

    const components = Array.isArray(componentsResult.data) ? componentsResult.data : [];
    const faults = Array.isArray(faultsResult.data) ? faultsResult.data : [];
    const componentToSheet = new Map<string, string>();

    components.forEach((component) => {
      if (component.technical_sheet_id) {
        componentToSheet.set(component.id, component.technical_sheet_id);
        componentsBySheet.set(component.technical_sheet_id, (componentsBySheet.get(component.technical_sheet_id) || 0) + 1);
      }
    });

    faults.forEach((fault) => {
      const sheetId = componentToSheet.get(fault.asset_component_id);
      if (sheetId) {
        faultsBySheet.set(sheetId, (faultsBySheet.get(sheetId) || 0) + 1);
      }
    });

    return NextResponse.json({
      sheets: (Array.isArray(data) ? data : []).map((sheet: Record<string, unknown>) => ({
        ...sheet,
        components_count: componentsBySheet.get(String(sheet.id)) || 0,
        fault_modes_count: faultsBySheet.get(String(sheet.id)) || 0,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las fichas tecnicas';
    return NextResponse.json({ sheets: [], error: message }, { status: 500 });
  }
}
