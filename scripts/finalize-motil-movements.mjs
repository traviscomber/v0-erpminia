import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { xz } from '@napi-rs/lzma'

const TRANSFER_ID = 'motil-movements-xz-v8'
const EXPECTED_COMPRESSED_SHA256 = '3752cdadb3a3daf0aa550008161269435244401ec0c0d9dfa1c10d29ed30060f'
const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
const TARGET = 35744
const BATCH_SIZE = 500

if (process.env.VERCEL_ENV !== 'production') {
  console.log('[motil-movements] skip: non-production build')
  process.exit(0)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('[motil-movements] missing Supabase production environment')

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function canonicalCount() {
  const { count, error } = await supabase
    .from('production_material_movements')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ORG_ID)
  if (error) throw error
  return count ?? 0
}

const before = await canonicalCount()
console.log(`[motil-movements] canonical before: ${before}/${TARGET}`)
if (before === TARGET) {
  console.log('[motil-movements] already complete')
  process.exit(0)
}
if (before > TARGET) throw new Error(`[motil-movements] count ${before} exceeds target ${TARGET}`)

const { data: chunks, error: chunkError } = await supabase
  .from('production_canonical_transfer_chunks')
  .select('chunk_index,payload_b64')
  .eq('transfer_id', TRANSFER_ID)
  .order('chunk_index', { ascending: true })
if (chunkError) throw chunkError
if (!chunks?.length) throw new Error('[motil-movements] staging missing')
for (let i = 0; i < chunks.length; i += 1) {
  if (chunks[i].chunk_index !== i) throw new Error(`[motil-movements] staging gap at chunk ${i}`)
}

const joined = chunks.map((row) => row.payload_b64).join('')
const pad = '='.repeat((4 - (joined.length % 4)) % 4)
const compressed = Buffer.from(joined + pad, 'base64')
const hash = createHash('sha256').update(compressed).digest('hex')
if (hash !== EXPECTED_COMPRESSED_SHA256) throw new Error('[motil-movements] staging SHA-256 mismatch')
console.log(`[motil-movements] staging verified: ${compressed.length} bytes, ${chunks.length} chunks`)

const decoded = await xz.decompress(compressed)
const payload = JSON.parse(Buffer.from(decoded).toString('utf8'))
if (!payload || typeof payload !== 'object' || !payload.d || !Array.isArray(payload.r)) {
  throw new Error('[motil-movements] invalid compact payload shape')
}
if (payload.r.length !== TARGET) {
  throw new Error(`[motil-movements] expected ${TARGET} staged rows, found ${payload.r.length}`)
}
console.log(`[motil-movements] decoded and validated: ${payload.r.length} rows`)

let submitted = 0
for (let offset = 0; offset < TARGET; offset += BATCH_SIZE) {
  const rows = payload.r.slice(offset, Math.min(TARGET, offset + BATCH_SIZE))
  const { data, error } = await supabase.rpc('import_motil_movement_compact_v10', {
    p: { d: payload.d, r: rows },
  })
  if (error) throw new Error(`[motil-movements] RPC failed at offset ${offset}: ${error.message}`)
  submitted += Number(data ?? rows.length)
  if (offset % 5000 === 0 || offset + BATCH_SIZE >= TARGET) {
    const current = await canonicalCount()
    console.log(`[motil-movements] progress: offset=${Math.min(TARGET, offset + BATCH_SIZE)} submitted=${submitted} canonical=${current}/${TARGET}`)
  }
}

const after = await canonicalCount()
if (after !== TARGET) throw new Error(`[motil-movements] final reconciliation failed: ${after}/${TARGET}`)
console.log(`[motil-movements] COMPLETE: ${after}/${TARGET}`)
