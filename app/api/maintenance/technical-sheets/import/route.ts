export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { loadXlsxModule } from '@/lib/xlsx';

type ImportRow = {
  asset_code: string;
  asset_name: string;
  brand_name: string;
  model_name: string;
  source_url: string;
  source_type: string;
  source_version: string;
  validated: boolean;
  raw_specs: Record<string, unknown>;
  component_code: string;
  component_name: string;
  component_level: number;
  component_criticality: string;
  component_status: string;
  fault_code: string;
  fault_name: string;
  fault_severity: string;
  symptom: string;
  cause: string;
  effect: string;
  recommended_action: string;
};

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeCode(value: unknown) {
  return normalizeText(value).toUpperCase().replace(/\s+/g, '-');
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseBoolean(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  return ['si', 's', 'true', '1', 'yes', 'y'].includes(text);
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseJson(value: unknown) {
  const text = normalizeText(value);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseCsvRows(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    asset_code: pickIndex(headers, ['asset_code', 'codigo_activo', 'codigo activo', 'codigo']),
    asset_name: pickIndex(headers, ['asset_name', 'nombre_activo', 'nombre activo', 'activo']),
    brand_name: pickIndex(headers, ['brand_name', 'marca', 'fabricante']),
    model_name: pickIndex(headers, ['model_name', 'modelo']),
    source_url: pickIndex(headers, ['source_url', 'url', 'enlace']),
    source_type: pickIndex(headers, ['source_type', 'tipo_fuente']),
    source_version: pickIndex(headers, ['source_version', 'version']),
    validated: pickIndex(headers, ['validated', 'validado', 'validada']),
    raw_specs: pickIndex(headers, ['raw_specs', 'specs', 'especificaciones']),
    component_code: pickIndex(headers, ['component_code', 'codigo_componente', 'componente_codigo']),
    component_name: pickIndex(headers, ['component_name', 'nombre_componente', 'componente_nombre']),
    component_level: pickIndex(headers, ['component_level', 'nivel']),
    component_criticality: pickIndex(headers, ['component_criticality', 'criticidad']),
    component_status: pickIndex(headers, ['component_status', 'estado_componente', 'estado']),
    fault_code: pickIndex(headers, ['fault_code', 'codigo_falla', 'falla_codigo']),
    fault_name: pickIndex(headers, ['fault_name', 'nombre_falla', 'falla_nombre']),
    fault_severity: pickIndex(headers, ['fault_severity', 'severidad']),
    symptom: pickIndex(headers, ['symptom', 'sintoma']),
    cause: pickIndex(headers, ['cause', 'causa']),
    effect: pickIndex(headers, ['effect', 'efecto']),
    recommended_action: pickIndex(headers, ['recommended_action', 'accion', 'accion_recomendada']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const assetCode = normalizeCode(values[columns.asset_code]);
    const assetName = values[columns.asset_name] || '';
    if (!assetCode && !assetName) return [];

    return [
      {
        asset_code: assetCode,
        asset_name: assetName,
        brand_name: values[columns.brand_name] || '',
        model_name: values[columns.model_name] || '',
        source_url: values[columns.source_url] || '',
        source_type: values[columns.source_type] || 'manual',
        source_version: values[columns.source_version] || '',
        validated: parseBoolean(values[columns.validated]),
        raw_specs: parseJson(values[columns.raw_specs]),
        component_code: normalizeCode(values[columns.component_code]),
        component_name: values[columns.component_name] || '',
        component_level: parseNumber(values[columns.component_level]) || 1,
        component_criticality: values[columns.component_criticality] || 'media',
        component_status: values[columns.component_status] || 'activo',
        fault_code: normalizeCode(values[columns.fault_code]),
        fault_name: values[columns.fault_name] || '',
        fault_severity: values[columns.fault_severity] || 'media',
        symptom: values[columns.symptom] || '',
        cause: values[columns.cause] || '',
        effect: values[columns.effect] || '',
        recommended_action: values[columns.recommended_action] || '',
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  if (!rows.length) return [];

  const csvText = [
    rows[0].map((value) => normalizeText(value)).join(';'),
    ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';')),
  ].join('\n');

  return parseCsvRows(csvText);
}

async function parseImportFile(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.csv')) {
    return parseCsvRows(await file.text());
  }

  if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
    return parseWorkbook(file);
  }

  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Se requiere archivo CSV, XLS o XLSX' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    const rows = await parseImportFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron fichas validas en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    let importedSheets = 0;
    let updatedSheets = 0;
    let importedComponents = 0;
    let updatedComponents = 0;
    let importedFaultModes = 0;
    let updatedFaultModes = 0;
    let skippedAssets = 0;

    for (const row of rows) {
      const assetCode = normalizeCode(row.asset_code);
      const assetName = normalizeText(row.asset_name);

      const { data: asset, error: assetError } = await context.supabase
        .from('maintenance_assets')
        .select('id, asset_code, asset_name')
        .eq('organization_id', context.organizationId)
        .or(`asset_code.eq.${assetCode},asset_name.eq.${assetName}`)
        .maybeSingle();

      if (assetError) throw assetError;
      if (!asset?.id) {
        skippedAssets += 1;
        continue;
      }

      const sheetPayload = {
        organization_id: context.organizationId,
        asset_id: asset.id,
        model_name: row.model_name,
        brand_name: row.brand_name,
        source_url: row.source_url,
        source_type: row.source_type || 'manual',
        source_version: row.source_version || null,
        validated: row.validated,
        raw_specs: row.raw_specs,
      };

      const { data: existingSheet, error: sheetLookupError } = await context.supabase
        .from('asset_technical_sheets')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('asset_id', asset.id)
        .maybeSingle();

      if (sheetLookupError) throw sheetLookupError;

      let technicalSheetId = existingSheet?.id as string | undefined;
      if (technicalSheetId) {
        const { error: updateError } = await context.supabase
          .from('asset_technical_sheets')
          .update(sheetPayload)
          .eq('id', technicalSheetId)
          .eq('organization_id', context.organizationId);
        if (updateError) throw updateError;
        updatedSheets += 1;
      } else {
        const { data: insertedSheet, error: insertError } = await context.supabase
          .from('asset_technical_sheets')
          .insert(sheetPayload)
          .select('id')
          .single();
        if (insertError) throw insertError;
        technicalSheetId = insertedSheet.id as string;
        importedSheets += 1;
      }

      if (row.component_code && row.component_name && technicalSheetId) {
        const componentPayload = {
          organization_id: context.organizationId,
          asset_id: asset.id,
          technical_sheet_id: technicalSheetId,
          component_code: row.component_code,
          component_name: row.component_name,
          component_level: row.component_level || 1,
          criticality: row.component_criticality || 'media',
          status: row.component_status || 'activo',
          source_type: row.source_type || 'manual',
          notes: null,
        };

        const { data: existingComponent, error: componentLookupError } = await context.supabase
          .from('asset_components')
          .select('id')
          .eq('organization_id', context.organizationId)
          .eq('asset_id', asset.id)
          .eq('component_code', row.component_code)
          .maybeSingle();

        if (componentLookupError) throw componentLookupError;

        let componentId = existingComponent?.id as string | undefined;
        if (componentId) {
          const { error: componentUpdateError } = await context.supabase
            .from('asset_components')
            .update(componentPayload)
            .eq('id', componentId)
            .eq('organization_id', context.organizationId);
          if (componentUpdateError) throw componentUpdateError;
          updatedComponents += 1;
        } else {
          const { data: insertedComponent, error: componentInsertError } = await context.supabase
            .from('asset_components')
            .insert(componentPayload)
            .select('id')
            .single();
          if (componentInsertError) throw componentInsertError;
          componentId = insertedComponent.id as string;
          importedComponents += 1;
        }

        if (componentId && (row.fault_code || row.fault_name)) {
          const faultPayload = {
            organization_id: context.organizationId,
            asset_component_id: componentId,
            fault_code: row.fault_code || row.component_code,
            fault_name: row.fault_name || row.component_name,
            symptom: row.symptom || null,
            cause: row.cause || null,
            effect: row.effect || null,
            severity: row.fault_severity || 'media',
            recommended_action: row.recommended_action || null,
            source_type: row.source_type || 'manual',
            notes: null,
          };

          const { data: existingFault, error: faultLookupError } = await context.supabase
            .from('asset_component_fault_modes')
            .select('id')
            .eq('organization_id', context.organizationId)
            .eq('asset_component_id', componentId)
            .eq('fault_code', faultPayload.fault_code)
            .maybeSingle();

          if (faultLookupError) throw faultLookupError;

          if (existingFault?.id) {
            const { error: faultUpdateError } = await context.supabase
              .from('asset_component_fault_modes')
              .update(faultPayload)
              .eq('id', existingFault.id)
              .eq('organization_id', context.organizationId);
            if (faultUpdateError) throw faultUpdateError;
            updatedFaultModes += 1;
          } else {
            const { error: faultInsertError } = await context.supabase.from('asset_component_fault_modes').insert(faultPayload);
            if (faultInsertError) throw faultInsertError;
            importedFaultModes += 1;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Fichas tecnicas importadas correctamente',
      imported_sheets: importedSheets,
      updated_sheets: updatedSheets,
      imported_components: importedComponents,
      updated_components: updatedComponents,
      imported_fault_modes: importedFaultModes,
      updated_fault_modes: updatedFaultModes,
      skipped_assets: skippedAssets,
      total: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron importar las fichas tecnicas';
    console.error('[maintenance/technical-sheets/import]', error);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}
