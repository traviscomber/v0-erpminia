import { createHash, timingSafeEqual } from "node:crypto"
import { createRequire } from "node:module"
import { getSupabaseAdmin } from "@/lib/db/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const TRANSFER_ID = "motil-movements-xz-v8"
const EXPECTED_COMPRESSED_SHA256 = "3752cdadb3a3daf0aa550008161269435244401ec0c0d9dfa1c10d29ed30060f"
const OPS_TOKEN_SHA256 = "e05314582dea7c16437fb315cdd414302743cda6226a13e1e127af32c4a603e2"
const TARGET = 35744

function authorized(request: Request) {
  const url = new URL(request.url)
  const token = request.headers.get("x-ops-token") ?? url.searchParams.get("token") ?? ""
  const digest = createHash("sha256").update(token).digest("hex")
  return timingSafeEqual(Buffer.from(digest), Buffer.from(OPS_TOKEN_SHA256))
}

async function canonicalCount() {
  const supabase = getSupabaseAdmin()
  const { count, error } = await supabase.from("production_material_movements").select("id", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}

async function loadCompactPayload() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from("production_canonical_transfer_chunks").select("chunk_index,payload_b64").eq("transfer_id", TRANSFER_ID).order("chunk_index", { ascending: true })
  if (error) throw error
  if (!data?.length) throw new Error("movement staging not found")
  for (let i = 0; i < data.length; i += 1) if (data[i].chunk_index !== i) throw new Error(`movement staging gap at chunk ${i}`)
  const joined = data.map((row) => row.payload_b64).join("")
  const pad = "=".repeat((4 - (joined.length % 4)) % 4)
  const compressed = Buffer.from(joined + pad, "base64")
  const payloadHash = createHash("sha256").update(compressed).digest("hex")
  if (payloadHash !== EXPECTED_COMPRESSED_SHA256) throw new Error("movement staging hash mismatch")

  const runtimeRequire = createRequire(import.meta.url)
  const moduleName = ["@napi-rs", "lzma", "xz"].join("/")
  const { decompress } = runtimeRequire(moduleName) as { decompress: (input: Buffer) => Promise<Uint8Array> }
  const decoded = await decompress(compressed)
  const decodedText = Buffer.from(decoded).toString("utf8")
  const parsed = JSON.parse(decodedText)
  if (!Array.isArray(parsed?.r) || !parsed?.d || typeof parsed.d !== "object") throw new Error("not compact movement payload")
  if (parsed.r.length !== TARGET) throw new Error(`expected ${TARGET} rows, found ${parsed.r.length}`)
  return { parsed, compressedBytes: compressed.length, decodedBytes: Buffer.byteLength(decodedText) }
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 })
  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get("mode") ?? "status"
    const before = await canonicalCount()
    if (mode === "status") return Response.json({ ok: true, canonicalCount: before, target: TARGET, complete: before === TARGET })
    const loaded = await loadCompactPayload()
    if (mode === "inspect") return Response.json({ ok: true, transferId: TRANSFER_ID, stagedRows: loaded.parsed.r.length, dictionaryKeys: Object.keys(loaded.parsed.d).length, compressedBytes: loaded.compressedBytes, decodedBytes: loaded.decodedBytes, canonicalCount: before, target: TARGET })
    if (mode !== "import") return Response.json({ ok: false, error: "unsupported_mode" }, { status: 400 })
    if (before >= TARGET) return Response.json({ ok: before === TARGET, locked: true, canonicalCount: before, target: TARGET })

    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0)
    const limit = Math.min(5000, Math.max(250, Number(url.searchParams.get("limit")) || 5000))
    const end = Math.min(TARGET, offset + limit)
    const supabase = getSupabaseAdmin()
    let submitted = 0
    for (let cursor = offset; cursor < end; cursor += 250) {
      const batch = loaded.parsed.r.slice(cursor, Math.min(end, cursor + 250))
      const { data, error } = await supabase.rpc("import_motil_movement_compact_v10", { p: { d: loaded.parsed.d, r: batch } })
      if (error) throw error
      submitted += Number(data ?? batch.length)
    }
    const after = await canonicalCount()
    return Response.json({ ok: true, offset, end, requested: end - offset, submitted, canonicalBefore: before, canonicalAfter: after, target: TARGET, complete: after === TARGET })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
