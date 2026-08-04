import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { read, utils } from 'xlsx'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
const BUCKET = 'module-documents'

const FILES = [
  {
    path: 'prevencion/documentos-hse/1781099533099_19.1_matriz_iper.xlsx',
    section: 'risk_management',
    kind: 'risk' as const,
  },
  {
    path: 'prevencion/documentos-hse/1781107901239_seguimiento_y_control_procedimientos_de_s_so.xls',
    section: 'controlled_procedures',
    kind: 'control' as const,
  },
  {
    path: 'prevencion/documentos-hse/1781107927727_seguimiento_y_control_de_reglamentos_de_s_so.xls',
    section: 'controlled_regulations',
    kind: 'control' as const,
  },
  {
    path: 'prevencion/documentos-hse/1781109263318_maestro_licencias_internas_de_conduccion_marzo_2026.xls',
    section: 'internal_driving_licenses',
    kind: 'credential' as const,
  },
  {
    path: 'prevencion/documentos-hse/1781113725862_seguimiento_y_control_instructivos_de_s_so.xls',
    section: 'controlled_instructions',
    kind: 'control' as const,
  },
]

type Row = Record<string, unknown>

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function cleanValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value.trim()
  return value
}

function normalizeRow(row: Row) {
  return Object.fromEntries(
    Object.entries(row)
      .map(([key, value]) => [normalizeKey(key), cleanValue(value)])
      .filter(([key, value]) => key && value !== '' && value !== null && value !== undefined),
  ) as Row
}

function first(row: Row, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[alias]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function text(row: Row, aliases: string[]) {
  const value = first(row, aliases)
  return value == null ? null : String(value).trim()
}

function numberValue(row: Row, aliases: string[]) {
  const value = first(row, aliases)
  if (value == null) return null
  const n = Number(String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function dateValue(row: Row, aliases: string[]) {
  const value = first(row, aliases)
  if (value == null) return null
  if (typeof value === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30))
    epoch.setUTCDate(epoch.getUTCDate() + value)
    return epoch.toISOString().slice(0, 10)
  }
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function listValue(row: Row, aliases: string[]) {
  const value = text(row, aliases)
  return value ? value.split(/[,;/|]/).map((item) => item.trim()).filter(Boolean) : []
}

function rowHash(filePath: string, sheet: string, rowNumber: number, row: Row) {
  return createHash('sha256')
    .update(JSON.stringify({ filePath, sheet, rowNumber, row }))
    .digest('hex')
}

function hasData(row: Row) {
  return Object.values(row).some((value) => value !== null && value !== undefined && String(value).trim() !== '')
}

function riskPayload(row: Row, sourceRowId: string) {
  const hazard = text(row, ['peligro', 'factor_de_riesgo', 'agente', 'hazard'])
  if (!hazard) return null
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
    likelihood: numberValue(row, ['probabilidad', 'p']),
    severity: numberValue(row, ['consecuencia_valor', 'severidad', 'c']),
    risk_score: numberValue(row, ['nivel_de_riesgo', 'valor_riesgo', 'nr']),
    risk_level: text(row, ['clasificacion', 'nivel', 'criticidad', 'categoria_riesgo']),
    residual_likelihood: numberValue(row, ['probabilidad_residual', 'pr']),
    residual_severity: numberValue(row, ['severidad_residual', 'cr']),
    residual_score: numberValue(row, ['riesgo_residual', 'nrr']),
    residual_level: text(row, ['nivel_residual', 'clasificacion_residual']),
    responsible_person: text(row, ['responsable', 'responsable_control', 'dueno_del_riesgo']),
    review_date: dateValue(row, ['fecha_revision', 'proxima_revision', 'fecha_actualizacion']),
    status: text(row, ['estado']) || 'active',
    metadata: row,
  }
}

function controlPayload(row: Row, sourceRowId: string, section: string) {
  const title = text(row, ['nombre', 'titulo', 'documento', 'nombre_documento', 'procedimiento', 'reglamento', 'instructivo'])
  if (!title) return null
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
  }
}

function credentialPayload(row: Row, sourceRowId: string) {
  const personName = text(row, ['nombre', 'nombre_completo', 'trabajador', 'conductor', 'persona'])
  if (!personName) return null
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
  }
}

async function upsertBatches(client: ReturnType<typeof createClient>, table: string, rows: Row[]) {
  const batchSize = 500
  for (let i = 0; i < rows.length; i += batchSize) {
    const { error } = await client.schema('canonical').from(table).upsert(rows.slice(i, i + batchSize), {
      onConflict: table === 'hse_source_rows'
        ? 'source_document_id,source_sheet,source_row,source_hash'
        : 'source_row_id',
    })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  if (process.env.HSE_CANONICAL_IMPORT_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Importer disabled' }, { status: 404 })
  }
  const token = request.headers.get('x-admin-token')
  if (!token || token !== process.env.ADMIN_INIT_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Supabase server configuration missing' }, { status: 500 })
  }

  const client = createClient(url, serviceKey, { auth: { persistSession: false } })
  const report: Array<Record<string, unknown>> = []

  for (const spec of FILES) {
    const { data: document, error: documentError } = await client
      .from('module_documents')
      .select('id,document_name,file_path')
      .eq('file_path', spec.path)
      .single()
    if (documentError || !document) throw new Error(`Document not found: ${spec.path}`)

    const { data: blob, error: downloadError } = await client.storage.from(BUCKET).download(spec.path)
    if (downloadError || !blob) throw new Error(`Download failed for ${spec.path}: ${downloadError?.message}`)

    const workbook = read(await blob.arrayBuffer(), { type: 'array', cellDates: true, dense: true })
    let sourceCount = 0
    let promotedCount = 0
    const sheets: Array<Record<string, unknown>> = []

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rawRows = utils.sheet_to_json<Row>(sheet, { defval: null, raw: false, dateNF: 'yyyy-mm-dd' })
      const sourceRows: Row[] = []

      for (let index = 0; index < rawRows.length; index += 1) {
        const normalized = normalizeRow(rawRows[index])
        if (!hasData(normalized)) continue
        sourceRows.push({
          organization_id: ORG_ID,
          source_document_id: document.id,
          source_file_path: spec.path,
          source_sheet: sheetName,
          source_row: index + 2,
          source_hash: rowHash(spec.path, sheetName, index + 2, normalized),
          raw_data: rawRows[index],
          normalized_data: normalized,
          canonical_section: spec.section,
          validation_status: 'pending',
          validation_notes: [],
          updated_at: new Date().toISOString(),
        })
      }

      await upsertBatches(client, 'hse_source_rows', sourceRows)
      sourceCount += sourceRows.length

      const { data: persistedRows, error: persistedError } = await client
        .schema('canonical')
        .from('hse_source_rows')
        .select('id,source_row,normalized_data')
        .eq('source_document_id', document.id)
        .eq('source_sheet', sheetName)
      if (persistedError) throw new Error(persistedError.message)

      const promoted: Row[] = []
      const validIds: string[] = []
      const invalidIds: string[] = []

      for (const persisted of persistedRows || []) {
        const row = persisted.normalized_data as Row
        const payload = spec.kind === 'risk'
          ? riskPayload(row, persisted.id)
          : spec.kind === 'credential'
            ? credentialPayload(row, persisted.id)
            : controlPayload(row, persisted.id, spec.section)
        if (payload) {
          promoted.push(payload)
          validIds.push(persisted.id)
        } else {
          invalidIds.push(persisted.id)
        }
      }

      if (promoted.length) {
        await upsertBatches(
          client,
          spec.kind === 'risk' ? 'hse_risks' : spec.kind === 'credential' ? 'hse_person_credentials' : 'hse_document_controls',
          promoted,
        )
      }
      if (validIds.length) {
        await client.schema('canonical').from('hse_source_rows').update({ validation_status: 'valid' }).in('id', validIds)
      }
      if (invalidIds.length) {
        await client.schema('canonical').from('hse_source_rows').update({
          validation_status: 'warning',
          validation_notes: ['No canonical identity fields detected; retained as source row'],
        }).in('id', invalidIds)
      }

      promotedCount += promoted.length
      sheets.push({ sheet: sheetName, sourceRows: sourceRows.length, promoted: promoted.length, warnings: invalidIds.length })
    }

    await client.from('module_documents').update({
      canonical_section: spec.section,
      extracted_data: {
        imported_at: new Date().toISOString(),
        sheets,
        source_rows: sourceCount,
        promoted_rows: promotedCount,
      },
    }).eq('id', document.id)

    report.push({
      document: document.document_name,
      canonicalSection: spec.section,
      sheets,
      sourceRows: sourceCount,
      promotedRows: promotedCount,
    })
  }

  return NextResponse.json({ ok: true, report })
}
