import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EXPECTED_XZ_SHA256 = "3752cdadb3a3daf0aa550008161269435244401ec0c0d9dfa1c10d29ed30060f"
const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return Response.json({ ok: false, error: "preview_only" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const payload = typeof body?.payload === "string" ? body.payload : ""
    const compressed = Buffer.from(payload, "base64")
    if (!payload || compressed.length === 0 || compressed.length > MAX_COMPRESSED_BYTES) {
      return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }
    const payloadHash = createHash("sha256").update(compressed).digest("hex")
    if (payloadHash !== EXPECTED_XZ_SHA256) {
      return Response.json({ ok: false, error: "payload_not_allowed" }, { status: 403 })
    }

    const result = spawnSync("xz", ["-dc"], {
      input: compressed,
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
    })
    if (result.error) throw result.error
    if (result.status !== 0) {
      throw new Error((result.stderr?.toString("utf8") || `xz exited ${result.status}`).slice(0, 1000))
    }

    const text = result.stdout.toString("utf8")
    const parsed = JSON.parse(text)
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.r) ? parsed.r : Array.isArray(parsed?.rows) ? parsed.rows : null

    if (body?.mode === "slice") {
      if (!Array.isArray(parsed?.r) || !parsed?.d || typeof parsed.d !== "object") {
        return Response.json({ ok: false, error: "not_compact_payload" }, { status: 422 })
      }
      const offset = Math.max(0, Number(body?.offset) || 0)
      const limit = Math.min(500, Math.max(1, Number(body?.limit) || 250))
      const batch = parsed.r.slice(offset, offset + limit)
      return Response.json({ ok: true, payload: { d: parsed.d, r: batch }, offset, returned: batch.length, total: parsed.r.length })
    }

    return Response.json({
      ok: true,
      compressedBytes: compressed.length,
      decodedBytes: result.stdout.length,
      type: Array.isArray(parsed) ? "array" : typeof parsed,
      keys: parsed && typeof parsed === "object" ? Object.keys(parsed).slice(0, 30) : [],
      rowCount: rows?.length ?? null,
      dictionaryKeys: parsed?.d && typeof parsed.d === "object" ? Object.keys(parsed.d).length : null,
    })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
