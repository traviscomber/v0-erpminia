import { createHash, timingSafeEqual } from "node:crypto"
import { getSupabaseAdmin } from "@/lib/db/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const TRANSFER_ID = "motil-movements-xz-v8"
const EXPECTED_COMPRESSED_SHA256 = "3752cdadb3a3daf0aa550008161269435244401ec0c0d9dfa1c10d29ed30060f"
const OPS_TOKEN_SHA256 = "e05314582dea7c16437fb315cdd414302743cda6226a13e1e127af32c4a603e2"
const TARGET = 35744

function authorized(request: Request) {
  const token = request.headers.get("x-ops-token") ?? ""
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

async function loadVerifiedCompressed() {
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
  const joined = data.map((row) => row.payload_b64).join("")
  const pad = "=".repeat((4 - (joined.length % 4)) % 4)
  const compressed = Buffer.from(joined + pad, "base64")
  const payloadHash = createHash("sha256").update(compressed).digest("hex")
  if (payloadHash !== EXPECTED_COMPRESSED_SHA256) throw new Error("movement staging hash mismatch")
  return compressed
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 })
  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get("mode") ?? "status"
    if (mode === "status") {
      const count = await canonicalCount()
      return Response.json({ ok: true, canonicalCount: count, target: TARGET, complete: count === TARGET })
    }
    if (mode !== "download") return Response.json({ ok: false, error: "unsupported_mode" }, { status: 400 })
    const compressed = await loadVerifiedCompressed()
    return new Response(compressed, {
      status: 200,
      headers: {
        "content-type": "application/x-xz",
        "content-length": String(compressed.length),
        "cache-control": "no-store",
        "x-content-sha256": EXPECTED_COMPRESSED_SHA256,
      },
    })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 })
  try {
    const before = await canonicalCount()
    if (before >= TARGET) return Response.json({ ok: before === TARGET, locked: true, canonicalCount: before, target: TARGET })
    const payload = await request.json()
    if (!payload || typeof payload !== "object" || !payload.d || !Array.isArray(payload.r)) {
      return Response.json({ ok: false, error: "invalid_compact_batch" }, { status: 400 })
    }
    if (payload.r.length < 1 || payload.r.length > 500) {
      return Response.json({ ok: false, error: "batch_size_out_of_range" }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc("import_motil_movement_compact_v10", { p: payload })
    if (error) throw error
    const after = await canonicalCount()
    return Response.json({ ok: true, submitted: Number(data ?? payload.r.length), canonicalBefore: before, canonicalAfter: after, target: TARGET, complete: after === TARGET })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
