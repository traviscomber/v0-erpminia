#!/usr/bin/env node

import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import process from "node:process"
import pg from "pg"
import * as XLSX from "xlsx"

const { Client } = pg

const DEFAULT_SHEET = "Stock min-max"
const CHUNK_SIZE = 500
const BLOCKED_CODES = new Set(["Filtro0203", "Repuesto1688"])

function parseArgs(argv) {
  const result = { commit: false, sheet: DEFAULT_SHEET }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--commit") result.commit = true
    else if (arg === "--file") result.file = argv[++index]
    else if (arg === "--organization-id") result.organizationId = argv[++index]
    else if (arg === "--sheet") result.sheet = argv[++index]
    else if (arg === "--help" || arg === "-h") result.help = true
    else throw new Error(`Argumento desconocido: ${arg}`)
  }

  return result
}

function printHelp() {
  console.log(`Uso:
  npm run canonical:products -- --file <archivo.xlsx> --organization-id <uuid> [--sheet "Stock min-max"] [--commit]

Comportamiento:
  - Sin --commit ejecuta validación y conciliación en modo dry-run.
  - Con --commit registra staging, enriquece productos existentes y crea históricos inactivos.
  - Nunca elimina productos ni desactiva registros vigentes del sitio.

Variables requeridas:
  DATABASE_URL  Conexión PostgreSQL de backend/service role.`)
}

function normalizeText(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim().replace(/\s+/g, " ")
  return text.length ? text : null
}

function normalizeCode(value) {
  return normalizeText(value)
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null

  const raw = String(value).trim()
  if (!raw || raw === "---") return null

  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "")

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value
  if (value === null || value === undefined || value === "") return null

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (["si", "s", "yes", "true", "1", "activo", "vigente"].includes(normalized)) return true
  if (["no", "n", "false", "0", "inactivo", "descontinuado"].includes(normalized)) return false
  return null
}

function getValue(row, candidates) {
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, candidate)) return row[candidate]
  }
  return null
}

function mapRow(row, sourceRow) {
  const productCode = normalizeCode(
    getValue(row, ["Código", "CODIGO", "Código producto", "Codigo", "SKU", "sku"]),
  )
  const description = normalizeText(
    getValue(row, ["Descripción", "DESCRIPCION", "Producto", "Nombre", "Detalle"]),
  )
  const unit = normalizeText(getValue(row, ["Unidad", "UNIDAD", "Unidad de medida", "U.M."]))
  const standardCost = normalizeNumber(
    getValue(row, ["Costo", "COSTO", "Costo unitario", "Valor unitario", "Precio costo"]),
  )
  const minimumStock = normalizeNumber(
    getValue(row, ["Stock mínimo", "Stock Min", "Mínimo", "Minimo", "STOCK MINIMO"]),
  )
  const maximumStock = normalizeNumber(
    getValue(row, ["Stock máximo", "Stock Max", "Máximo", "Maximo", "STOCK MAXIMO"]),
  )
  const taxRateRaw = normalizeNumber(getValue(row, ["IVA", "Tasa IVA", "% IVA"]))
  const taxRate = taxRateRaw !== null && taxRateRaw > 1 ? taxRateRaw / 100 : taxRateRaw
  const isPurchasable = normalizeBoolean(getValue(row, ["Se compra", "Comprable", "Compra"]))
  const isSellable = normalizeBoolean(getValue(row, ["Se vende", "Vendible", "Venta"]))
  const isDiscontinued = normalizeBoolean(
    getValue(row, ["Descontinuado", "Discontinuado", "Inactivo", "Estado"]),
  )

  return {
    sourceRow,
    productCode,
    description,
    unit,
    standardCost,
    minimumStock,
    maximumStock,
    taxRate,
    isPurchasable,
    isSellable,
    isDiscontinued,
    sourcePayload: row,
  }
}

function validateRows(mappedRows) {
  const valid = []
  const errors = []
  const seenCodes = new Map()

  for (const row of mappedRows) {
    if (!row.productCode) {
      errors.push({ ...row, severity: "error", code: "missing_product_code", message: "Código de producto ausente" })
      continue
    }

    if (BLOCKED_CODES.has(row.productCode)) {
      errors.push({ ...row, severity: "error", code: "shifted_columns", message: "Fila bloqueada por columnas desplazadas" })
      continue
    }

    if (!row.description) {
      errors.push({ ...row, severity: "error", code: "missing_description", message: "Descripción de producto ausente" })
      continue
    }

    const normalizedKey = row.productCode.toLocaleLowerCase("es-CL")
    if (seenCodes.has(normalizedKey)) {
      errors.push({
        ...row,
        severity: "error",
        code: "duplicate_code_in_file",
        message: `Código duplicado en filas ${seenCodes.get(normalizedKey)} y ${row.sourceRow}`,
      })
      continue
    }

    seenCodes.set(normalizedKey, row.sourceRow)
    valid.push(row)
  }

  return { valid, errors }
}

function chunk(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

async function insertCandidates(client, organizationId, batchId, rows) {
  for (const part of chunk(rows, CHUNK_SIZE)) {
    const values = []
    const parameters = []

    part.forEach((row, index) => {
      const base = index * 13
      values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13}::jsonb)`)
      parameters.push(
        organizationId,
        batchId,
        row.sourceRow,
        row.productCode,
        row.description,
        row.standardCost,
        row.isDiscontinued,
        row.isPurchasable,
        row.isSellable,
        row.maximumStock,
        row.minimumStock,
        row.taxRate,
        JSON.stringify({ ...row.sourcePayload, __normalized_unit: row.unit }),
      )
    })

    await client.query(
      `insert into staging.product_import_candidates (
        organization_id, import_batch_id, source_row, product_code, description,
        standard_cost, is_discontinued, is_purchasable, is_sellable,
        maximum_stock, minimum_stock, tax_rate, source_payload
      ) values ${values.join(",")}
      on conflict (organization_id, import_batch_id, product_code) do update set
        source_row = excluded.source_row,
        description = excluded.description,
        standard_cost = excluded.standard_cost,
        is_discontinued = excluded.is_discontinued,
        is_purchasable = excluded.is_purchasable,
        is_sellable = excluded.is_sellable,
        maximum_stock = excluded.maximum_stock,
        minimum_stock = excluded.minimum_stock,
        tax_rate = excluded.tax_rate,
        source_payload = excluded.source_payload`,
      parameters,
    )
  }
}

async function insertValidationErrors(client, batchId, sheet, errors) {
  for (const error of errors) {
    await client.query(
      `insert into staging.validation_errors (
        batch_id, source_sheet, source_row, entity_type, entity_key,
        severity, error_code, message, raw_data
      ) values ($1,$2,$3,'product',$4,$5,$6,$7,$8::jsonb)`,
      [
        batchId,
        sheet,
        error.sourceRow,
        error.productCode,
        error.severity,
        error.code,
        error.message,
        JSON.stringify(error.sourcePayload ?? {}),
      ],
    )
  }
}

async function reconcileAndPromote(client, { organizationId, batchId, sourceFile, sheet, fileHash }) {
  const summary = await client.query(
    `with candidates as (
       select c.*,
              nullif(c.source_payload->>'__normalized_unit','') as normalized_unit
       from staging.product_import_candidates c
       where c.organization_id = $1 and c.import_batch_id = $2
     ),
     enriched as (
       update canonical.products p
       set description = coalesce(p.description, c.description),
           unit = coalesce(p.unit, c.normalized_unit),
           standard_cost = coalesce(p.standard_cost, c.standard_cost),
           tax_rate = coalesce(p.tax_rate, c.tax_rate),
           minimum_stock = coalesce(p.minimum_stock, c.minimum_stock),
           maximum_stock = coalesce(p.maximum_stock, c.maximum_stock),
           is_purchasable = coalesce(p.is_purchasable, c.is_purchasable),
           is_sellable = coalesce(p.is_sellable, c.is_sellable),
           source_payload = p.source_payload || jsonb_build_object('stock_min_max', c.source_payload),
           updated_at = now()
       from candidates c
       where p.organization_id = c.organization_id
         and lower(p.product_code) = lower(c.product_code)
       returning p.id
     ),
     inserted as (
       insert into canonical.products (
         organization_id, product_code, name, description, unit, standard_cost,
         tax_rate, minimum_stock, maximum_stock, is_purchasable, is_sellable,
         is_active, validation_status, validation_notes,
         source_file, source_sheet, source_row, import_batch_id, source_hash, source_payload
       )
       select
         c.organization_id,
         c.product_code,
         c.description,
         c.description,
         c.normalized_unit,
         c.standard_cost,
         c.tax_rate,
         c.minimum_stock,
         c.maximum_stock,
         c.is_purchasable,
         c.is_sellable,
         false,
         'pending',
         array['Producto presente solo en archivo histórico; requiere aprobación manual'],
         $3,
         $4,
         c.source_row,
         $2,
         $5,
         c.source_payload
       from candidates c
       where not exists (
         select 1 from canonical.products p
         where p.organization_id = c.organization_id
           and lower(p.product_code) = lower(c.product_code)
       )
       on conflict do nothing
       returning id
     )
     select
       (select count(*) from candidates)::integer as staged,
       (select count(*) from enriched)::integer as enriched,
       (select count(*) from inserted)::integer as inserted`,
    [organizationId, batchId, sourceFile, sheet, fileHash],
  )

  return summary.rows[0]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  if (!args.file) throw new Error("Falta --file")
  if (!args.organizationId) throw new Error("Falta --organization-id")
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL")

  const bytes = await readFile(args.file)
  const fileHash = createHash("sha256").update(bytes).digest("hex")
  const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true })
  const worksheet = workbook.Sheets[args.sheet]
  if (!worksheet) throw new Error(`No existe la hoja '${args.sheet}'`)

  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: true })
  const mappedRows = rawRows.map((row, index) => mapRow(row, index + 2))
  const { valid, errors } = validateRows(mappedRows)

  console.log(JSON.stringify({
    mode: args.commit ? "commit" : "dry-run",
    sourceFile: args.file,
    sheet: args.sheet,
    sha256: fileHash,
    totalRows: mappedRows.length,
    validRows: valid.length,
    errorRows: errors.length,
    blockedCodes: errors.filter((error) => error.code === "shifted_columns").map((error) => error.productCode),
  }, null, 2))

  if (!args.commit) return

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    await client.query("begin")

    const batchResult = await client.query(
      `insert into staging.import_batches (
        organization_id, source_file, source_file_sha256, source_type,
        status, total_rows, valid_rows, warning_rows, error_rows, metadata
      ) values ($1,$2,$3,'products','staged',$4,$5,0,$6,$7::jsonb)
      on conflict (organization_id, source_file_sha256, source_type) do update set
        total_rows = excluded.total_rows,
        valid_rows = excluded.valid_rows,
        warning_rows = excluded.warning_rows,
        error_rows = excluded.error_rows,
        metadata = staging.import_batches.metadata || excluded.metadata
      returning id`,
      [
        args.organizationId,
        args.file.split(/[\\/]/).pop(),
        fileHash,
        mappedRows.length,
        valid.length,
        errors.length,
        JSON.stringify({ sheet: args.sheet, importer: "scripts/import-canonical-products.mjs" }),
      ],
    )

    const batchId = batchResult.rows[0].id
    await client.query("delete from staging.product_import_candidates where import_batch_id = $1", [batchId])
    await client.query("delete from staging.validation_errors where batch_id = $1 and entity_type = 'product'", [batchId])

    await insertCandidates(client, args.organizationId, batchId, valid)
    await insertValidationErrors(client, batchId, args.sheet, errors)

    const promoted = await reconcileAndPromote(client, {
      organizationId: args.organizationId,
      batchId,
      sourceFile: args.file.split(/[\\/]/).pop(),
      sheet: args.sheet,
      fileHash,
    })

    await client.query(
      `update staging.import_batches
       set status = 'promoted', validated_at = now(), promoted_at = now(),
           metadata = metadata || $2::jsonb
       where id = $1`,
      [batchId, JSON.stringify({ reconciliation: promoted })],
    )

    await client.query("commit")
    console.log(JSON.stringify({ batchId, ...promoted, errors: errors.length }, null, 2))
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
