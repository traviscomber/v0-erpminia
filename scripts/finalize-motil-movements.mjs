import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { xz } from '@napi-rs/lzma'

const TRANSFER_ID = 'motil-movements-compact-v1'
const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
const TARGET = 35744
const EXPECTED_CHUNKS = 84
const EXPECTED_ENCODED_CHARS = 420000
const BATCH_SIZE = 500

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = input.replace(/\s+/g, '').replace(/=+$/g, '').toUpperCase()
  const out = []
  let buffer = 0
  let bits = 0
  for (const ch of clean) {
    const value = alphabet.indexOf(ch)
    if (value < 0) throw new Error(`[motil-movements] invalid Base32 character ${ch}`)
    buffer = (buffer << 5) | value
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >> bits) & 0xff)
      buffer &= (1 << bits) - 1
    }
  }
  return Buffer.from(out)
}

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
  .select('chunk_index,payload_b64,payload_sha256')
  .eq('transfer_id', TRANSFER_ID)
  .order('chunk_index', { ascending: true })
if (chunkError) throw chunkError
if (!chunks || chunks.length !== EXPECTED_CHUNKS) {
  throw new Error(`[motil-movements] expected ${EXPECTED_CHUNKS} chunks, found ${chunks?.length ?? 0}`)
}
for (let i = 0; i < chunks.length; i += 1) {
  const chunk = chunks[i]
  if (chunk.chunk_index !== i) throw new Error(`[motil-movements] staging gap at chunk ${i}`)
  const chunkHash = createHash('sha256').update(chunk.payload_b64).digest('hex')
  if (chunkHash !== chunk.payload_sha256) throw new Error(`[motil-movements] chunk checksum failed at ${i}`)
}

const encoded = chunks.map((row) => row.payload_b64).join('')
if (encoded.length !== EXPECTED_ENCODED_CHARS) {
  throw new Error(`[motil-movements] expected ${EXPECTED_ENCODED_CHARS} encoded chars, found ${encoded.length}`)
}
const compressed = base32Decode(encoded)
const magic = compressed.subarray(0, 6).toString('hex')
const footer = compressed.subarray(-2).toString('hex')
if (magic !== 'fd377a585a00') throw new Error(`[motil-movements] invalid XZ magic ${magic}`)
if (footer !== '595a') throw new Error(`[motil-movements] incomplete XZ footer ${footer}`)
console.log(`[motil-movements] staging verified: ${compressed.length} bytes, ${chunks.length} chunks, XZ footer OK`)

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
