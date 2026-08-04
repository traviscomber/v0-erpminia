export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';
import { buildReferencePreventiveAlerts, resolveTechnicalSheetReference } from '@/lib/maintenance/technical-sheet-library';

type AssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  location: string | null;
  status: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  criticality: string | null;
  mtbf_hours: number | string | null;
  acquisition_date: string | null;
};

type TemplateRow = {
  id: string;
  vehicle_type: string | null;
  name: string | null;
  code: string | null;
  level: number | string | null;
  description: string | null;
};

type FaultModeRow = {
  id: string;
  component_template_id: string | null;
  fault_code: string | null;
  fault_name: string | null;
  severity: string | null;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function familyMatchesTemplate(family: string | null, template: TemplateRow) {
  const familyText = normalizeText(family);
  const nameText = normalizeText(template.name);
  const vehicleTypeText = normalizeText(template.vehicle_type);

  if (!familyText) return Number(template.level || 0) <= 1;

  const familyHints: Record<string, string[]> = {
    camionetas: ['camioneta', 'hilux', 'terrano', 'frontier', 'amarok', 'f-150'],
    camiones: ['camion', 'cargo', 'volvo', 'auman', 'foton'],
    'cargadores de bajo perfil': ['cargador', 'scoop', 'bajo perfil'],
    'cargadores frontales': ['cargador frontal'],
    'camiones de bajo perfil': ['dumper', 'mk-a20', 'bajo perfil'],
    compresores: ['compresor'],
    'equipos de sondaje': ['sondaje', 'sonda'],
    'excavadoras y retroexcavadoras': ['excavadora', 'retroexcavadora'],
    'grupos generadores': ['generador', 'electrogeno'],
    planta: ['planta', 'correa', 'molino', 'chancadora'],
    exploracion: ['exploracion', 'perforacion', 'tronadura'],
    'proyectos en ejecucion': ['proyecto'],
  };

  const hints = familyHints[familyText] || [familyText];
  return hints.some((hint) => nameText.includes(hint) || vehicleTypeText.includes(hint));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const [assetResult, templateResult, faultModeResult] = await Promise.all([
      context.supabase
        .from('maintenance_assets')
        .select('id, asset_code, asset_name, asset_type, location, status, manufacturer, model, serial_number, criticality, mtbf_hours, acquisition_date')
        .eq('id', id)
        .eq('organization_id', context.organizationId)
        .maybeSingle(),
      context.supabase.from('components_template').select('id, vehicle_type, name, code, level, description'),
      context.supabase.from('fault_modes').select('id, component_template_id, fault_code, fault_name, severity'),
    ]);

    const safeTemplates = templateResult.error ? [] : templateResult.data;
    const safeFaultModes = faultModeResult.error ? [] : faultModeResult.data;
    let asset = !assetResult.error && assetResult.data ? (assetResult.data as AssetRow) : null;

    if (!asset) {
      const { data: costCenter } = await context.supabase
        .from('cost_centers')
        .select('id, code, name, status')
        .eq('id', id)
        .eq('organization_id', context.organizationId)
        .maybeSingle();

      if (costCenter) {
        asset = {
          id: costCenter.id,
          asset_code: costCenter.code ?? null,
          asset_name: costCenter.name ?? null,
          asset_type: null,
          location: null,
          status: costCenter.status ?? 'activo',
          manufacturer: null,
          model: null,
          serial_number: null,
          criticality: null,
          mtbf_hours: null,
          acquisition_date: null,
        };
      }
    }

    if (!asset) {
      return NextResponse.json({ error: 'No se encontro el activo solicitado' }, { status: 404 });
    }

    const assetText = `${asset.asset_name || ''} ${asset.asset_type || ''} ${asset.model || ''} ${asset.manufacturer || ''}`;
    const assetFamily = inferMachineFamilyFromText(assetText);
    const technicalReference = resolveTechnicalSheetReference(assetText, assetFamily);
    const referenceFields = technicalReference
      ? [
          ...technicalReference.keySpecs.map((item) => ({ key: item.label, value: item.value })),
          { key: 'Fuente oficial', value: technicalReference.sourceLabel },
          { key: 'Familia', value: technicalReference.family },
        ]
      : [];

    const templateRows = Array.isArray(safeTemplates) ? (safeTemplates as TemplateRow[]) : [];
    const faultModeRows = Array.isArray(safeFaultModes) ? (safeFaultModes as FaultModeRow[]) : [];
    const suggestedTemplates = templateRows
      .filter((template) => familyMatchesTemplate(assetFamily, template))
      .map((template) => ({
        id: template.id,
        code: template.code,
        name: template.name,
        vehicleType: template.vehicle_type,
        level: template.level,
        description: template.description,
        faultModes: faultModeRows
          .filter((fault) => fault.component_template_id === template.id)
          .map((fault) => ({
            id: fault.id,
            code: fault.fault_code,
            name: fault.fault_name,
            severity: fault.severity,
          })),
      }))
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }));

    return NextResponse.json({
      asset: {
        id: asset.id,
        code: asset.asset_code,
        name: asset.asset_name,
        type: asset.asset_type,
        location: asset.location,
        status: asset.status,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serialNumber: asset.serial_number,
        criticality: asset.criticality,
        mtbfHours: asset.mtbf_hours !== null && asset.mtbf_hours !== undefined ? Number(asset.mtbf_hours) : null,
        purchaseDate: asset.acquisition_date,
        lastMaintenance: null,
        nextMaintenance: null,
      },
      technicalSheet: {
        family: assetFamily,
        sourceUrl: technicalReference?.sourceUrl || null,
        fields: referenceFields,
        rawSpecs: {},
        status: referenceFields.length > 0 ? 'reference_available' : 'pending',
      },
      referenceSheet: technicalReference
        ? {
            brand: technicalReference.brand,
            model: technicalReference.model,
            family: technicalReference.family,
            sourceUrl: technicalReference.sourceUrl,
            sourceLabel: technicalReference.sourceLabel,
            summary: technicalReference.summary,
            keySpecs: technicalReference.keySpecs,
            components: technicalReference.components,
          }
        : null,
      preventiveAlerts: buildReferencePreventiveAlerts(technicalReference),
      componentProfile: suggestedTemplates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la ficha tecnica del activo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
