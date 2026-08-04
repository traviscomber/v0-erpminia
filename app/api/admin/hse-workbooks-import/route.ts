export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { read, utils } from 'xlsx/xlsx.mjs';
import { createHash } from 'crypto';

const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';
const BUCKET = 'module-documents';

const WORKBOOKS = [
  {
    path: 'prevencion/documentos-hse/1781099533099_19.1_matriz_iper.xlsx',
    section: 'risk_management',
    kind: 'risk',
    logicalName: '19.1 Matriz IPER.xlsx',
  },
  {
    path: 'prevencion/documentos-hse/1781107901239_seguimiento_y_control_procedimientos_de_s_so.xls',
    section: 'controlled_procedures',
    kind: 'control',
    logicalName: 'Seguimiento y control procedimientos de S&SO.xls',
  },
  {
    path: 'prevencion/documentos-hse/1781107927727_seguimiento_y_control_de_reglamentos_de_s_so.xls',
    section: 'controlled_regulations',
    kind: 'control',
    logicalName: 'Seguimiento y control de Reglamentos de S&SO.xls',
  },
  {
    path: 'prevencion/documentos-hse/1781109263318_maestro_licencias_internas_de_conduccion_marzo_2026.xls',
    section: 'internal_driving_licenses',
    kind: 'credential',
    logicalName: 'MAESTRO LICENCIAS INTERNAS DE CONDUCCIÓN marzo 2026.xls',
  },
  {
    path: 'prevencion/documentos-hse/1781113725862_seguimiento_y_control_instructivos_de_s_so.xls',
    section: 'controlled_instructions',
    kind: 'control',
    logicalName: 'Seguimiento y control Instructivos de S&SO.xls',
  },
];

type Row = Record<string, unknown>;

function isAuthorized(req: NextRequest) {
  const token = process.env.ADMIN_INIT_TOKEN;
  if (!token) return false;
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const xToken = req.headers.get('x-admin-token') || '';
  return bearer === token || xToken === token;
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function cleanValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.trim();
  return value;
}

function normalizeRow(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row)
      .map(([key, value]) => [normalizeKey(key), cleanValue(value)])
      .filter(([key, value]) => key && value !== '' && value !== null && value !== undefined),
  ) as Row;
}

function hasData(row: Row): boolean {
  return Object.values(row).some((value) => value !== null && value !== undefined && String(value).trim() !== '');
}

function first(row: Row, aliases: string[]): unknown {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function text(row: Row, aliases: string[]): string | null {
  const value = first(row, aliases);
  return value == null ? null : String(value).trim();
}

function dateValue(row: Row, aliases: string[]): string | null {
  const value = first(row, aliases);
  if (value == null) return null;
  if (typeof value === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + value);
    return epoch.toISOString().slice(0, 10);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function listValue(row: Row, aliases: string[]): string[] {
  const value = text(row, aliases);
  return value ? value.split(/[,;/|]/).map((item) => item.trim()).filter(Boolean) : [];
}

function rowHash(filePath: string, sheet: string, rowNumber: number, row: Row): string {
  return createHash('sha256')
    .update(JSON.stringify({ filePath, sheet, rowNumber, row }))
    .digest('hex');
}

function riskPayload(row: Row, sourceRowId: string): Record<string, unknown> | null {
  const hazard = text(row, ['peligro', 'factor_de_riesgo', 'agente', 'hazard']);
  if (!hazard) return null;
  return {
    organization_id: ORG_ID,
    source_row_id: sourceRowId,
    risk_code: text(row, ['codigo', 'id', 'n', 'numero']),
    process_area: text(row, ['proceso', 'area', 'proceso_area', 'lugar']),
    task_activity: text(row, ['actividad', 'tarea', 'actividad_tarea']),
    hazard,
    risk_description: text(row, ['riesgo', 'descripcion_del_riesgo', 'riesgo_asociado']),
    consequence: text(row, ['consecuencia', 'consecuencias', 'dano']),
    existing_controls: text(row, ['medidas_de_control', 'controles_existentes', 'control', 'medidas']),
    likelihood: null,
    severity: null,
    risk_score: null,
    risk_level: text(row, ['clasificacion', 'nivel', 'criticidad', 'categoria_riesgo']),
    residual_likelihood: null,
    residual_severity: null,
    residual_score: null,
    residual_level: null,
    responsible_person: text(row, ['responsable', 'responsable_control', 'dueno_del_riesgo']),
    review_date: dateValue(row, ['fecha_revision', 'proxima_revision', 'fecha_actualizacion']),
    status: text(row, ['estado']) || 'active',
    metadata: row,
  };
}

function controlPayload(row: Row, sourceRowId: string, section: string): Record<string, unknown> | null {
  const title = text(row, ['nombre', 'titulo', 'documento', 'nombre_documento', 'procedimiento', 'reglamento', 'instructivo']);
  if (!title) return null;
  return {
    organization_id: ORG_ID,
    source_row_id: sourceRowId,
    document_code: text(row, ['codigo', 'cod', 'codigo_documento', 'identificacion']),
    title,
    document_class: section.replace('controlled_', ''),
    version_text: text(row, ['version', 'revision', 'rev']),
    issue_date: dateValue(row, ['fecha_emision', 'fecha_vigencia', 'fecha']),
    last_review_date: dateValue(row, ['ultima_revision', 'fecha_revision', 'fecha_actualizacion']),
    next_review_date: dateValue(row, ['proxima_revision', 'fecha_proxima_revision', 'fecha_vencimiento']),
    status: text(row, ['estado', 'vigencia', 'status']),
    responsible_person: text(row, ['responsable', 'elaborado_por', 'dueno']),
    responsible_area: text(row, ['area', 'departamento', 'gerencia']),
    evidence: text(row, ['registro', 'evidencia', 'observaciones']),
    metadata: row,
  };
}

function credentialPayload(row: Row, sourceRowId: string): Record<string, unknown> | null {
  const personName = text(row, ['nombre', 'nombre_completo', 'trabajador', 'conductor', 'persona']);
  if (!personName) return null;
  return {
    organization_id: ORG_ID,
    source_row_id: sourceRowId,
    person_name: personName,
    person_rut: text(row, ['rut', 'rut_trabajador', 'run']),
    credential_type: 'internal_driving_license',
    credential_number: text(row, ['numero_licencia', 'n_licencia', 'licencia', 'numero']),
    credential_class: text(row, ['clase', 'tipo_licencia', 'categoria']),
    authorized_assets: listValue(row, ['equipos_autorizados', 'vehiculos_autorizados', 'equipo', 'vehiculo']),
    issue_date: dateValue(row, ['fecha_emision', 'fecha_otorgamiento', 'fecha_inicio']),
    expiry_date: dateValue(row, ['fecha_vencimiento', 'vencimiento', 'vigencia_hasta']),
    status: text(row, ['estado', 'vigencia']),
    issuer: text(row, ['emisor', 'otorgada_por', 'autorizado_por']),
    metadata: row,
  };
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { file?: string; offset?: number; limit?: number };
    const file = body.file || 'all';
    const offset = Math.max(body.offset || 0, 0);
    const limit = Math.min(Math.max(body.limit || 500, 100), 1000);

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const targetWorkbooks = file === 'all' ? WORKBOOKS : WORKBOOKS.filter((w) => w.path.includes(file));
    if (targetWorkbooks.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 400 });
    }

    const report: Array<Record<string, unknown>> = [];

    for (const spec of targetWorkbooks) {
      const { data: docBlob, error: downloadError } = await sb.storage.from(BUCKET).download(spec.path);
      if (downloadError || !docBlob) {
        report.push({
          file: spec.logicalName,
          error: `Download failed: ${downloadError?.message}`,
        });
        continue;
      }

      const workbook = read(await docBlob.arrayBuffer(), { type: 'array', cellDates: true, dense: false });

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rawRows = (utils.sheet_to_json(sheet, { defval: null, raw: false }) as unknown) as Row[];

        let sourceRows: Row[] = [];
        let promoted: Row[] = [];
        let warnings = 0;
        let invalids = 0;

        for (let idx = 0; idx < rawRows.length; idx++) {
          if (idx < offset || idx >= offset + limit) continue;

          const normalized = normalizeRow(rawRows[idx]);
          if (!hasData(normalized)) {
            invalids++;
            continue;
          }

          const sourceRowId = createHash('sha256')
            .update(`${spec.path}::${sheetName}::${idx}`)
            .digest('hex');

          const sourceRow: Row = {
            organization_id: ORG_ID,
            source_file_path: spec.path,
            source_sheet: sheetName,
            source_row: idx + 1,
            source_hash: rowHash(spec.path, sheetName, idx + 1, normalized),
            raw_data: rawRows[idx],
            normalized_data: normalized,
            canonical_section: spec.section,
            validation_status: 'pending',
            validation_notes: [],
            imported_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Try to promote to canonical table
          let payload: Record<string, unknown> | null = null;
          if (spec.kind === 'risk') {
            payload = riskPayload(normalized, sourceRowId);
          } else if (spec.kind === 'credential') {
            payload = credentialPayload(normalized, sourceRowId);
          } else if (spec.kind === 'control') {
            payload = controlPayload(normalized, sourceRowId, spec.section);
          }

          if (payload) {
            sourceRow.validation_status = 'valid';
            promoted.push(payload);
          } else {
            sourceRow.validation_status = 'warning';
            sourceRow.validation_notes = ['Could not extract required fields'];
            warnings++;
          }

          sourceRows.push(sourceRow);
        }

        // Insert source rows
        if (sourceRows.length > 0) {
          const { error: insertError } = await sb.from('hse_source_rows').upsert(sourceRows, {
            onConflict: 'organization_id,source_file_path,source_sheet,source_row,source_hash',
          });

          if (insertError) {
            report.push({
              file: spec.logicalName,
              sheet: sheetName,
              error: `Source rows insert failed: ${insertError.message}`,
            });
            continue;
          }
        }

        // Insert promoted rows
        if (promoted.length > 0) {
          const tableName = spec.kind === 'risk' ? 'hse_risks' : spec.kind === 'credential' ? 'hse_person_credentials' : 'hse_document_controls';
          const { error: promotedError } = await sb.from(tableName).upsert(promoted, {
            onConflict: 'organization_id,source_row_id',
          });

          if (promotedError) {
            report.push({
              file: spec.logicalName,
              sheet: sheetName,
              error: `Promoted rows insert failed: ${promotedError.message}`,
            });
            continue;
          }
        }

        report.push({
          file: spec.logicalName,
          sheet: sheetName,
          rowsRead: rawRows.length,
          sourceRowsInserted: sourceRows.length,
          promotedRows: promoted.length,
          warnings,
          invalids,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      report,
      nextOffset: offset + limit,
    });
  } catch (error) {
    console.error('[API] HSE workbooks import error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }
}
