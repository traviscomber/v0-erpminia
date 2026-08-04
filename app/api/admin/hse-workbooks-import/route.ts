export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { read, utils } from 'xlsx/xlsx.mjs'
import { createHash } from 'crypto'

const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
const BUCKET = 'module-documents'

const WORKBOOKS = [
  { path: 'prevencion/documentos-hse/1781099533099_19.1_matriz_iper.xlsx', section: 'risk_management', kind: 'risk', logicalName: '19.1 Matriz IPER.xlsx' },
  { path: 'prevencion/documentos-hse/1781107901239_seguimiento_y_control_procedimientos_de_s_so.xls', section: 'controlled_procedures', kind: 'control', logicalName: 'Seguimiento y control procedimientos de S&SO.xls' },
  { path: 'prevencion/documentos-hse/1781107927727_seguimiento_y_control_de_reglamentos_de_s_so.xls', section: 'controlled_regulations', kind: 'control', logicalName: 'Seguimiento y control de Reglamentos de S&SO.xls' },
  { path: 'prevencion/documentos-hse/1781109263318_maestro_licencias_internas_de_conduccion_marzo_2026.xls', section: 'internal_driving_licenses', kind: 'credential', logicalName: 'MAESTRO LICENCIAS INTERNAS DE CONDUCCIÓN marzo 2026.xls' },
  { path: 'prevencion/documentos-hse/1781113725862_seguimiento_y_control_instructivos_de_s_so.xls', section: 'controlled_instructions', kind: 'control', logicalName: 'Seguimiento y control Instructivos de S&SO.xls' },
] as const

type Row = Record<string, unknown>

function isAuthorized(req: NextRequest) {
  const token = process.env.ADMIN_INIT_TOKEN
  if (!token) return false
  const auth = req.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  return bearer === token || req.headers.get('x-admin-token') === token
}

function normalizeKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function normalizeRow(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value instanceof Date ? value.toISOString() : typeof value === 'string' ? value.trim() : value]).filter(([key, value]) => key && value !== '' && value !== null && value !== undefined))
}

function first(row: Row, aliases: string[]) {
  for (const alias of aliases) if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') return row[alias]
  return null
}

function text(row: Row, aliases: string[]) {
  const value = first(row, aliases)
  return value == null ? null : String(value).trim()
}

function numeric(row: Row, aliases: string[]) {
  const value = first(row, aliases)
  if (value == null) return null
  const parsed = Number(String(value).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function dateValue(row: Row, aliases: string[]) {
  const value = first(row, aliases)
  if (value == null) return null
  if (typeof value === 'number') {
    const date = new Date(Date.UTC(1899, 11, 30))
    date.setUTCDate(date.getUTCDate() + value)
    return date.toISOString().slice(0, 10)
  }
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

function listValue(row: Row, aliases: string[]) {
  const value = text(row, aliases)
  return value ? value.split(/[,;/|]/).map((item) => item.trim()).filter(Boolean) : []
}

function rowHash(filePath: string, sheet: string, rowNumber: number, row: Row) {
  return createHash('sha256').update(JSON.stringify({ filePath, sheet, rowNumber, row })).digest('hex')
}

function riskPayload(row: Row, sourceRowId: string) {
  const hazard = text(row, ['peligro', 'factor_de_riesgo', 'agente', 'hazard'])
  if (!hazard) return null
  return {
    organization_id: ORG_ID, source_row_id: sourceRowId,
    risk_code: text(row, ['codigo', 'id', 'n', 'numero']), process_area: text(row, ['proceso', 'area', 'proceso_area', 'lugar']),
    task_activity: text(row, ['actividad', 'tarea', 'actividad_tarea']), hazard,
    risk_description: text(row, ['riesgo', 'descripcion_del_riesgo', 'riesgo_asociado']), consequence: text(row, ['consecuencia', 'consecuencias', 'dano']),
    existing_controls: text(row, ['medidas_de_control', 'controles_existentes', 'control', 'medidas']),
    likelihood: numeric(row, ['probabilidad', 'p']), severity: numeric(row, ['severidad', 'consecuencia_valor', 'c']), risk_score: numeric(row, ['nivel_de_riesgo', 'valor_riesgo', 'nr']),
    risk_level: text(row, ['clasificacion', 'nivel', 'criticidad', 'categoria_riesgo']), residual_likelihood: numeric(row, ['probabilidad_residual', 'pr']),
    residual_severity: numeric(row, ['severidad_residual', 'cr']), residual_score: numeric(row, ['riesgo_residual', 'nrr']), residual_level: text(row, ['nivel_residual', 'clasificacion_residual']),
    responsible_person: text(row, ['responsable', 'responsable_control', 'dueno_del_riesgo']), review_date: dateValue(row, ['fecha_revision', 'proxima_revision', 'fecha_actualizacion']),
    status: text(row, ['estado']) || 'active', metadata: row,
  }
}

function controlPayload(row: Row, sourceRowId: string, section: string) {
  const title = text(row, ['nombre', 'titulo', 'documento', 'nombre_documento', 'procedimiento', 'reglamento', 'instructivo'])
  if (!title) return null
  return {
    organization_id: ORG_ID, source_row_id: sourceRowId, document_code: text(row, ['codigo', 'cod', 'codigo_documento', 'identificacion']), title,
    document_class: section.replace('controlled_', '').replace(/s$/, ''), version_text: text(row, ['version', 'revision', 'rev']),
    issue_date: dateValue(row, ['fecha_emision', 'fecha_vigencia', 'fecha']), last_review_date: dateValue(row, ['ultima_revision', 'fecha_revision', 'fecha_actualizacion']),
    next_review_date: dateValue(row, ['proxima_revision', 'fecha_proxima_revision', 'fecha_vencimiento']), status: text(row, ['estado', 'vigencia', 'status']),
    responsible_person: text(row, ['responsable', 'elaborado_por', 'dueno']), responsible_area: text(row, ['area', 'departamento', 'gerencia']),
    evidence: text(row, ['registro', 'evidencia', 'observaciones']), metadata: row,
  }
}

function credentialPayload(row: Row, sourceRowId: string) {
  const personName = text(row, ['nombre', 'nombre_completo', 'trabajador', 'conductor', 'persona'])
  if (!personName) return null
  return {
    organization_id: ORG_ID, source_row_id: sourceRowId, person_name: personName, person_rut: text(row, ['rut', 'rut_trabajador', 'run']),
    credential_type: 'internal_driving_license', credential_number: text(row, ['numero_licencia', 'n_licencia', 'licencia', 'numero']),
    credential_class: text(row, ['clase', 'tipo_licencia', 'categoria']), authorized_assets: listValue(row, ['equipos_autorizados', 'vehiculos_autorizados', 'equipo', 'vehiculo']),
    issue_date: dateValue(row, ['fecha_emision', 'fecha_otorgamiento', 'fecha_inicio']), expiry_date: dateValue(row, ['fecha_vencimiento', 'vencimiento', 'vigencia_hasta']),
    status: text(row, ['estado', 'vigencia']), issuer: text(row, ['emisor', 'otorgada_por', 'autorizado_por']), metadata: row,
  }
}

export async function POST(req: NextRequest) {
  if (process.env.HSE_CANONICAL_IMPORT_ENABLED !== 'true') return NextResponse.json({ error: 'Importer disabled' }, { status: 403 })
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as { file?: string; offset?: number; limit?: number }
    const offset = Math.max(body.offset || 0, 0)
    const limit = Math.min(Math.max(body.limit || 500, 100), 1000)
    const selected = body.file && body.file !== 'all' ? WORKBOOKS.filter((item) => item.path.includes(body.file!)) : WORKBOOKS
    if (!selected.length) return NextResponse.json({ error: 'File not found' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return NextResponse.json({ error: 'Supabase server configuration missing' }, { status: 500 })
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } })
    const canonical = sb.schema('canonical')
    const report: Row[] = []
    let anyRemaining = false

    for (const spec of selected) {
      const { data: document, error: documentError } = await sb.from('module_documents').select('id,document_name,extracted_data').eq('file_path', spec.path).single()
      if (documentError || !document) { report.push({ file: spec.logicalName, error: 'Document metadata not found' }); continue }
      const { data: blob, error: downloadError } = await sb.storage.from(BUCKET).download(spec.path)
      if (downloadError || !blob) { report.push({ file: spec.logicalName, error: downloadError?.message || 'Download failed' }); continue }
      const workbook = read(await blob.arrayBuffer(), { type: 'array', cellDates: true })
      const workbookReport: Row[] = []

      for (const sheetName of workbook.SheetNames) {
        const rawRows = utils.sheet_to_json<Row>(workbook.Sheets[sheetName], { defval: null, raw: false, dateNF: 'yyyy-mm-dd' })
        const batch = rawRows.slice(offset, offset + limit)
        if (offset + limit < rawRows.length) anyRemaining = true
        const candidates = batch.map((raw, index) => {
          const normalized = normalizeRow(raw)
          const sourceRow = offset + index + 2
          return { raw, normalized, sourceRow, sourceHash: rowHash(spec.path, sheetName, sourceRow, normalized) }
        }).filter((item) => Object.keys(item.normalized).length > 0)

        const sourceRows = candidates.map((item) => ({
          organization_id: ORG_ID, source_document_id: document.id, source_file_path: spec.path, source_sheet: sheetName,
          source_row: item.sourceRow, source_hash: item.sourceHash, raw_data: item.raw, normalized_data: item.normalized,
          canonical_section: spec.section, validation_status: 'pending', validation_notes: [], updated_at: new Date().toISOString(),
        }))

        if (sourceRows.length) {
          const { error } = await canonical.from('hse_source_rows').upsert(sourceRows, { onConflict: 'source_document_id,source_sheet,source_row,source_hash' })
          if (error) { workbookReport.push({ sheet: sheetName, error: error.message }); continue }
        }

        const hashes = candidates.map((item) => item.sourceHash)
        const { data: persisted, error: persistedError } = hashes.length
          ? await canonical.from('hse_source_rows').select('id,source_hash,normalized_data').eq('source_document_id', document.id).eq('source_sheet', sheetName).in('source_hash', hashes)
          : { data: [], error: null }
        if (persistedError) { workbookReport.push({ sheet: sheetName, error: persistedError.message }); continue }

        const promoted: Row[] = []
        const validIds: string[] = []
        const warningIds: string[] = []
        for (const item of persisted || []) {
          const row = item.normalized_data as Row
          const payload = spec.kind === 'risk' ? riskPayload(row, item.id) : spec.kind === 'credential' ? credentialPayload(row, item.id) : controlPayload(row, item.id, spec.section)
          if (payload) { promoted.push(payload); validIds.push(item.id) } else warningIds.push(item.id)
        }

        if (promoted.length) {
          const table = spec.kind === 'risk' ? 'hse_risks' : spec.kind === 'credential' ? 'hse_person_credentials' : 'hse_document_controls'
          const { error } = await canonical.from(table).upsert(promoted, { onConflict: 'source_row_id' })
          if (error) { workbookReport.push({ sheet: sheetName, error: error.message }); continue }
        }
        if (validIds.length) await canonical.from('hse_source_rows').update({ validation_status: 'valid', validation_notes: [] }).in('id', validIds)
        if (warningIds.length) await canonical.from('hse_source_rows').update({ validation_status: 'warning', validation_notes: ['No canonical identity fields detected; retained as source row'] }).in('id', warningIds)

        workbookReport.push({ sheet: sheetName, rows: rawRows.length, processed: candidates.length, promoted: promoted.length, warnings: warningIds.length })
      }

      const totals = workbookReport.reduce((acc, item) => ({ source: acc.source + Number(item.processed || 0), promoted: acc.promoted + Number(item.promoted || 0), warnings: acc.warnings + Number(item.warnings || 0) }), { source: 0, promoted: 0, warnings: 0 })
      await sb.from('module_documents').update({
        canonical_section: spec.section,
        extracted_data: { ...(document.extracted_data || {}), imported_at: new Date().toISOString(), sheets: workbookReport, source_rows: totals.source, promoted_rows: totals.promoted, warning_rows: totals.warnings },
        updated_at: new Date().toISOString(),
      }).eq('id', document.id)
      report.push({ file: spec.logicalName, canonicalSection: spec.section, sheets: workbookReport })
    }

    return NextResponse.json({ ok: true, report, nextOffset: offset + limit, done: !anyRemaining })
  } catch (error) {
    console.error('[API] HSE workbook import error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
