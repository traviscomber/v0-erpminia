import { createHash, timingSafeEqual } from "node:crypto"
import { brotliDecompressSync } from "node:zlib"
import { getSupabaseAdmin } from "@/lib/db/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const TRANSFER_ID = "motil-production-2019-2026-v1"
const EXPECTED_COMPRESSED_SHA256 = "cf862c5f9962429da88200d12957eecc8558d627c61ada40c923525dcf30f67f"
const OPS_TOKEN_SHA256 = "d7ee43b7aa9985c842876d0ddd4737d8c6897f5476e68bd3d0bc5e67845579d5"
const TARGET = 35744
const EXPECTED_HEADERS = [
  "NUMERO",
  "FECHA",
  "CLIENTE",
  "DESCRIPCION",
  "CONDUCTOR",
  "EMPRESA TRANSPORTISTA",
  "PATENTE",
  "SECTOR",
  "MINA ORIGEN",
  "INTERIOR MINA",
  "NUMERO DE SELLO",
  "TONELAJE NETO",
  "DEUDA",
  "UNIDAD ORIGEN",
  "TONELADAS NORMALIZADAS",
  "ARCHIVO ORIGEN",
  "HOJA ORIGEN",
  "FILA ORIGEN",
  "SHA256 ARCHIVO",
  "SCHEMA ORIGEN",
  "ADAPTER VERSION",
] as const

type Matrix = [string[], unknown[][]]
type TransferPayload = { TRANSPORTE_CANONICO?: Matrix }

function authorized(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? ""
  const digest = createHash("sha256").update(token).digest("hex")
  return timingSafeEqual(Buffer.from(digest), Buffer.from(OPS_TOKEN_SHA256))
}

async function canonicalCount() {
  const supabase = getSupabaseAdmin()
  const { count, error } = await supabase
    .from("production_material_movements")
    .select("id", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}

async function loadMovementRows() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("production_canonical_transfer_chunks")
    .select("chunk_index,payload_b64,payload_sha256")
    .eq("transfer_id", TRANSFER_ID)
    .order("chunk_index", { ascending: true })

  if (error) throw error
  if (!data?.length) throw new Error("canonical transfer staging not found")
  for (let i = 0; i < data.length; i += 1) {
    if (data[i].chunk_index !== i) throw new Error(`canonical transfer gap at chunk ${i}`)
    const chunkHash = createHash("sha256").update(data[i].payload_b64).digest("hex")
    if (chunkHash !== data[i].payload_sha256) throw new Error(`chunk checksum failed at ${i}`)
  }

  const joined = data.map((row) => row.payload_b64).join("")
  const pad = "=".repeat((4 - (joined.length % 4)) % 4)
  const compressed = Buffer.from(joined.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64")
  const compressedHash = createHash("sha256").update(compressed).digest("hex")
  if (compressedHash !== EXPECTED_COMPRESSED_SHA256) throw new Error("canonical transfer checksum mismatch")

  const decoded = brotliDecompressSync(compressed)
  const payload = JSON.parse(decoded.toString("utf8")) as TransferPayload
  const matrix = payload.TRANSPORTE_CANONICO
  if (!Array.isArray(matrix) || !Array.isArray(matrix[0]) || !Array.isArray(matrix[1])) {
    throw new Error("TRANSPORTE_CANONICO matrix missing")
  }
  const [headers, rows] = matrix
  if (headers.length !== EXPECTED_HEADERS.length || headers.some((header, index) => header !== EXPECTED_HEADERS[index])) {
    throw new Error("canonical movement headers mismatch")
  }
  if (rows.length !== TARGET) throw new Error(`expected ${TARGET} movement rows, found ${rows.length}`)
  if (rows.some((row) => !Array.isArray(row) || row.length !== EXPECTED_HEADERS.length)) {
    throw new Error("canonical movement row width mismatch")
  }

  return { rows, headers, chunks: data.length, compressedBytes: compressed.length, decodedBytes: decoded.length }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get("mode") ?? "inspect"
    const before = await canonicalCount()
    if (before >= TARGET && mode === "import") {
      return Response.json({ ok: before === TARGET, locked: true, canonicalCount: before, target: TARGET })
    }

    const loaded = await loadMovementRows()
    if (mode === "inspect") {
      return Response.json({
        ok: true,
        transferId: TRANSFER_ID,
        chunks: loaded.chunks,
        compressedBytes: loaded.compressedBytes,
        decodedBytes: loaded.decodedBytes,
        stagedRows: loaded.rows.length,
        headers: loaded.headers,
        canonicalCount: before,
        target: TARGET,
      })
    }

    if (mode !== "import") {
      return Response.json({ ok: false, error: "unsupported_mode" }, { status: 400 })
    }

    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0)
    const limit = Math.min(5000, Math.max(1, Number(url.searchParams.get("limit")) || 2500))
    const end = Math.min(loaded.rows.length, offset + limit)
    const supabase = getSupabaseAdmin()
    let submitted = 0

    for (let cursor = offset; cursor < end; cursor += 250) {
      const batch = loaded.rows.slice(cursor, Math.min(end, cursor + 250))
      const { data, error } = await supabase.rpc("import_motil_movement_arrays", { p_rows: batch })
      if (error) throw error
      submitted += Number(data ?? batch.length)
    }

    const after = await canonicalCount()
    return Response.json({
      ok: true,
      transferId: TRANSFER_ID,
      offset,
      end,
      requested: end - offset,
      submitted,
      totalStagedRows: loaded.rows.length,
      canonicalBefore: before,
      canonicalAfter: after,
      target: TARGET,
      complete: after === TARGET,
    })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
