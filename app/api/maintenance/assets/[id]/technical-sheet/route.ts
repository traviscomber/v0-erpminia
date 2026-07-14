export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';
import { resolveTechnicalSheetReference } from '@/lib/maintenance/technical-sheet-library';

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
  purchase_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  specs: Record<string, unknown> | null;
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

function pickSourceUrl(specs: Record<string, unknown> | null) {
  if (!specs) return null;
  const keys = ['source_url', 'manual_url', 'document_url', 'datasheet_url', 'ficha_url', 'pdf_url'];
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  const technicalSheet = specs.technical_sheet;
  if (technicalSheet && typeof technicalSheet === 'object' && !Array.isArray(technicalSheet)) {
    for (const key of keys) {
      const value = (technicalSheet as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

function flattenSpecs(specs: Record<string, unknown> | null) {
  if (!specs) return [];
  return Object.entries(specs)
    .filter(([key, value]) => value !== null && value !== undefined && key !== 'technical_sheet')
    .map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }))
    .filter((item) => item.value.trim() !== '');
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
    const [{ data: asset, error: assetError }, { data: templates, error: templatesError }, { data: faultModes, error: faultModesError }] =
      await Promise.all([
        context.supabase
          .from('maintenance_assets')
          .select('id, asset_code, asset_name, asset_type, location, status, manufacturer, model, serial_number, criticality, mtbf_hours, purchase_date, last_maintenance, next_maintenance, specs')
          .eq('id', id)
          .eq('organization_id', context.organizationId)
          .maybeSingle(),
        context.supabase.from('components_template').select('id, vehicle_type, name, code, level, description'),
        context.supabase.from('fault_modes').select('id, component_template_id, fault_code, fault_name, severity'),
      ]);

    if (assetError) throw assetError;
    if (templatesError) throw templatesError;
    if (faultModesError) throw faultModesError;
    if (!asset) {
      return NextResponse.json({ error: 'No se encontro el activo solicitado' }, { status: 404 });
    }

    const assetFamily = inferMachineFamilyFromText(
      `${asset.asset_name || ''} ${asset.asset_type || ''} ${asset.model || ''} ${asset.manufacturer || ''}`,
    );
    const technicalReference = resolveTechnicalSheetReference(
      `${asset.asset_name || ''} ${asset.asset_type || ''} ${asset.model || ''} ${asset.manufacturer || ''}`,
      assetFamily,
    );

    const specs = (asset.specs || {}) as Record<string, unknown>;
    const technicalFields = flattenSpecs(specs);
    const sourceUrl = pickSourceUrl(specs) || technicalReference?.sourceUrl || null;
    const referenceFields = technicalReference
      ? [
          ...technicalReference.keySpecs,
          { key: 'Fuente oficial', value: technicalReference.sourceLabel },
          { key: 'Familia', value: technicalReference.family },
        ]
      : [];

    const templateRows = Array.isArray(templates) ? (templates as TemplateRow[]) : [];
    const faultModeRows = Array.isArray(faultModes) ? (faultModes as FaultModeRow[]) : [];
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
        purchaseDate: asset.purchase_date,
        lastMaintenance: asset.last_maintenance,
        nextMaintenance: asset.next_maintenance,
      },
      technicalSheet: {
        family: assetFamily,
        sourceUrl,
        fields: technicalFields.length > 0 ? technicalFields : referenceFields,
        rawSpecs: specs,
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
      componentProfile: suggestedTemplates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la ficha tecnica del activo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
