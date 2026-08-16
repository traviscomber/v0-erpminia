import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { getSupabaseAdmin } from "@/lib/db/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const TRANSFER_ID = "motil-movements-xz-v8"
const EXPECTED_XZ_SHA256 = "3752cdadb3a3daf0aa550008161269435244401ec0c0d9dfa1c10d29ed30060f"
const TARGET = 35744

async function loadCompactPayload() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("production_canonical_transfer_chunks")
    .select("chunk_index,payload_b64")
    .eq("transfer_id", TRANSFER_ID)
    .order("chunk_index", { ascending: true })

  if (error) throw error
  if (!data?.length) throw new Error("movement staging not found")
  for (let i = 0; i < data.length; i += 1) {
    if (data[i].chunk_index !== i) throw new Error(`movement staging gap at chunk ${i}`)
  }

  const compressed = Buffer.from(data.map((row) => row.payload_b64).join(""), "base64")
  const payloadHash = createHash("sha256").update(compressed).digest("hex")
  if (payloadHash !== EXPECTED_XZ_SHA256) throw new Error("movement staging hash mismatch")

  const result = spawnSync("xz", ["-dc"], {
    input: compressed,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error((result.stderr?.toString("utf8") || `xz exited ${result.status}`).slice(0, 1000))
  }

  const parsed = JSON.parse(result.stdout.toString("utf8"))
  return { parsed, chunks: data.length, compressedBytes: compressed.length, decodedBytes: result.stdout.length }
}

async function canonicalCount() {
  const supabase = getSupabaseAdmin()
  const { count, error } = await supabase
    .from("production_material_movements")
    .select("id", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return Response.json({ ok: false, error: "preview_only" }, { status: 404 })
  }

  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get("mode") ?? "inspect"
    const loaded = await loadCompactPayload()
    const { parsed } = loaded
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.r) ? parsed.r : Array.isArray(parsed?.rows) ? parsed.rows : null
    const before = await canonicalCount()

    if (mode === "inspect") {
      return Response.json({
        ok: true,
        transferId: TRANSFER_ID,
        chunks: loaded.chunks,
        compressedBytes: loaded.compressedBytes,
        decodedBytes: loaded.decodedBytes,
        type: Array.isArray(parsed) ? "array" : typeof parsed,
        keys: parsed && typeof parsed === "object" ? Object.keys(parsed).slice(0, 30) : [],
        rowCount: rows?.length ?? null,
        dictionaryKeys: parsed?.d && typeof parsed.d === "object" ? Object.keys(parsed.d).length : null,
        canonicalCount: before,
        target: TARGET,
      })
    }

    if (mode !== "import") {
      return Response.json({ ok: false, error: "unsupported_mode" }, { status: 400 })
    }
    if (!Array.isArray(parsed?.r) || !parsed?.d || typeof parsed.d !== "object") {
      return Response.json({ ok: false, error: "not_compact_payload" }, { status: 422 })
    }

    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0)
    const limit = Math.min(5000, Math.max(1, Number(url.searchParams.get("limit")) || 2500))
    const end = Math.min(parsed.r.length, offset + limit)
    const supabase = getSupabaseAdmin()
    let submitted = 0

    for (let cursor = offset; cursor < end; cursor += 250) {
      const batch = parsed.r.slice(cursor, Math.min(end, cursor + 250))
      const { data, error } = await supabase.rpc("import_motil_movement_compact_v10", {
        p: { d: parsed.d, r: batch },
      })
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
      totalStagedRows: parsed.r.length,
      canonicalBefore: before,
      canonicalAfter: after,
      target: TARGET,
      complete: after === TARGET,
    })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
