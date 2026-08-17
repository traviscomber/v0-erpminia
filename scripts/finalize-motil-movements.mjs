import { createHash } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const TRANSFER_ID = 'motil-movements-columnar-v2'
const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
const TARGET = 35744
const EXPECTED_ROWS = 10277
const EXPECTED_CHUNKS = 8
const EXPECTED_CHARS = 139648
const EXPECTED_XZ_BYTES = 104736
const EXPECTED_SHA = 'f5a2717ed02de9bb0e8ede5f11a9327e9abd8e9fca076bdd43feb2c2fb67ec35'
const BATCH = 500

if (process.env.VERCEL_ENV !== 'production') process.exit(0)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('[motil-final] missing Supabase production env')
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

async function canonicalCount() {
  const { count, error } = await sb.from('production_material_movements').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID)
  if (error) throw error
  return count ?? 0
}

const before = await canonicalCount()
console.log(`[motil-final] canonical before: ${before}/${TARGET}`)
if (before === TARGET) {
  console.log('[motil-final] already complete')
  process.exit(0)
}
if (before > TARGET) throw new Error(`[motil-final] count exceeds target: ${before}`)

const { data: chunks, error: chunkError } = await sb.from('production_canonical_transfer_chunks').select('chunk_index,payload_b64,payload_sha256').eq('transfer_id', TRANSFER_ID).order('chunk_index', { ascending: true })
if (chunkError) throw chunkError
if (!chunks || chunks.length !== EXPECTED_CHUNKS) throw new Error(`[motil-final] expected ${EXPECTED_CHUNKS} chunks, got ${chunks?.length ?? 0}`)
for (let i = 0; i < chunks.length; i++) {
  const c = chunks[i]
  if (c.chunk_index !== i) throw new Error(`[motil-final] chunk gap ${i}`)
  const h = createHash('sha256').update(c.payload_b64).digest('hex')
  if (h !== c.payload_sha256) throw new Error(`[motil-final] chunk hash mismatch ${i}`)
}
const joined = chunks.map(c => c.payload_b64).join('')
if (joined.length !== EXPECTED_CHARS) throw new Error(`[motil-final] encoded chars ${joined.length}`)
const compressed = Buffer.from(joined, 'base64')
if (compressed.length !== EXPECTED_XZ_BYTES) throw new Error(`[motil-final] XZ bytes ${compressed.length}`)
const globalSha = createHash('sha256').update(compressed).digest('hex')
if (globalSha !== EXPECTED_SHA) throw new Error(`[motil-final] global SHA mismatch ${globalSha}`)
if (compressed.subarray(0, 6).toString('hex') !== 'fd377a585a00') throw new Error('[motil-final] invalid XZ magic')
if (compressed.subarray(-2).toString('hex') !== '595a') throw new Error('[motil-final] invalid XZ footer')
console.log(`[motil-final] staging verified: chunks=${chunks.length} chars=${joined.length} bytes=${compressed.length} sha=${globalSha}`)

const tmp = '/tmp/motil-final.xz'
writeFileSync(tmp, compressed)
const dec = spawnSync('xz', ['-dc', tmp], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
try { unlinkSync(tmp) } catch {}
if (dec.error) throw dec.error
if (dec.status !== 0) throw new Error(`[motil-final] xz failed: ${dec.stderr}`)
const payload = JSON.parse(dec.stdout)
if (!payload || typeof payload !== 'object' || !payload.md || !Array.isArray(payload.m)) throw new Error('[motil-final] invalid payload')
if (payload.m.length !== EXPECTED_ROWS) throw new Error(`[motil-final] expected ${EXPECTED_ROWS} rows, got ${payload.m.length}`)

const rows = payload.m.map(row => row.map((value, index) => {
  const dict = payload.md[String(index)]
  return dict ? (dict[value] ?? null) : value
}))
if (rows.some(r => !Array.isArray(r) || r.length !== 21)) throw new Error('[motil-final] invalid decoded row width')
console.log(`[motil-final] decoded rows=${rows.length}; first=${JSON.stringify(rows[0])}; last=${JSON.stringify(rows.at(-1))}`)

let submitted = 0
for (let offset = 0; offset < rows.length; offset += BATCH) {
  const batch = rows.slice(offset, Math.min(rows.length, offset + BATCH))
  const { data, error } = await sb.rpc('import_motil_movement_arrays', { p_rows: batch })
  if (error) throw new Error(`[motil-final] RPC offset ${offset}: ${error.message}`)
  submitted += Number(data ?? batch.length)
  if (offset % 2000 === 0 || offset + BATCH >= rows.length) {
    console.log(`[motil-final] progress ${Math.min(rows.length, offset + BATCH)}/${rows.length}; canonical=${await canonicalCount()}/${TARGET}`)
  }
}

const after = await canonicalCount()
console.log(`[motil-final] COMPLETE candidate: before=${before} submitted=${submitted} after=${after}/${TARGET}`)
if (after !== TARGET) throw new Error(`[motil-final] final reconciliation failed ${after}/${TARGET}`)
