import { createHash } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

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

function recoverCompactPayload(text) {
  const marker = ',"r":['
  const markerPos = text.indexOf(marker)
  if (markerPos < 0) throw new Error('[motil-movements] compact row marker not found in recovered stream')
  const dictText = text.slice(0, markerPos) + '}'
  const head = JSON.parse(dictText)
  if (!head?.d || typeof head.d !== 'object') throw new Error('[motil-movements] recovered dictionary invalid')

  const rows = []
  const start = markerPos + marker.length
  let rowStart = -1
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '[') { if (depth === 0) rowStart = i; depth += 1; continue }
    if (ch === ']') {
      if (depth > 0) {
        depth -= 1
        if (depth === 0 && rowStart >= 0) {
          rows.push(JSON.parse(text.slice(rowStart, i + 1)))
          rowStart = -1
        }
      } else break
    }
  }
  return { d: head.d, r: rows }
}

if (process.env.VERCEL_ENV !== 'production') {
  console.log('[motil-movements] skip: non-production build')
  process.exit(0)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('[motil-movements] missing Supabase production environment')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

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
if (before === TARGET) { console.log('[motil-movements] already complete'); process.exit(0) }
if (before > TARGET) throw new Error(`[motil-movements] count ${before} exceeds target ${TARGET}`)

const { data: chunks, error: chunkError } = await supabase
  .from('production_canonical_transfer_chunks')
  .select('chunk_index,payload_b64,payload_sha256')
  .eq('transfer_id', TRANSFER_ID)
  .order('chunk_index', { ascending: true })
if (chunkError) throw chunkError
if (!chunks || chunks.length !== EXPECTED_CHUNKS) throw new Error(`[motil-movements] expected ${EXPECTED_CHUNKS} chunks, found ${chunks?.length ?? 0}`)
for (let i = 0; i < chunks.length; i += 1) {
  const chunk = chunks[i]
  if (chunk.chunk_index !== i) throw new Error(`[motil-movements] staging gap at chunk ${i}`)
  const chunkHash = createHash('sha256').update(chunk.payload_b64).digest('hex')
  if (chunkHash !== chunk.payload_sha256) throw new Error(`[motil-movements] chunk checksum failed at ${i}`)
}

const encoded = chunks.map((row) => row.payload_b64).join('')
if (encoded.length !== EXPECTED_ENCODED_CHARS) throw new Error(`[motil-movements] expected ${EXPECTED_ENCODED_CHARS} encoded chars, found ${encoded.length}`)
const compressed = base32Decode(encoded)
const magic = compressed.subarray(0, 6).toString('hex')
if (magic !== 'fd377a585a00') throw new Error(`[motil-movements] invalid XZ magic ${magic}`)
console.log(`[motil-movements] verified truncated staging: ${compressed.length} bytes, ${chunks.length} chunks`)

const tmp = '/tmp/motil-movements-truncated.xz'
writeFileSync(tmp, compressed)
const xz = spawnSync('xz', ['-dc', tmp], { encoding: null, maxBuffer: 64 * 1024 * 1024 })
try { unlinkSync(tmp) } catch {}
if (xz.error) throw new Error(`[motil-movements] system xz unavailable: ${xz.error.message}`)
const recovered = Buffer.isBuffer(xz.stdout) ? xz.stdout : Buffer.from(xz.stdout ?? '')
const stderr = Buffer.isBuffer(xz.stderr) ? xz.stderr.toString('utf8') : String(xz.stderr ?? '')
console.log(`[motil-movements] xz exit=${xz.status}; recovered decompressed bytes=${recovered.length}; stderr=${stderr.trim().slice(0,240)}`)
if (!recovered.length) throw new Error('[motil-movements] xz produced no partial output')

const payload = recoverCompactPayload(recovered.toString('utf8'))
console.log(`[motil-movements] recovered complete rows: ${payload.r.length}/${TARGET}`)
if (payload.r.length === 0) throw new Error('[motil-movements] no complete rows recovered')

let submitted = 0
for (let offset = 0; offset < payload.r.length; offset += BATCH_SIZE) {
  const rows = payload.r.slice(offset, Math.min(payload.r.length, offset + BATCH_SIZE))
  const { data, error } = await supabase.rpc('import_motil_movement_compact_v10', { p: { d: payload.d, r: rows } })
  if (error) throw new Error(`[motil-movements] RPC failed at offset ${offset}: ${error.message}`)
  submitted += Number(data ?? rows.length)
  if (offset % 5000 === 0 || offset + BATCH_SIZE >= payload.r.length) {
    const current = await canonicalCount()
    console.log(`[motil-movements] progress: recoveredOffset=${Math.min(payload.r.length, offset + BATCH_SIZE)} submitted=${submitted} canonical=${current}/${TARGET}`)
  }
}

const after = await canonicalCount()
console.log(`[motil-movements] RECOVERY COMPLETE: canonical=${after}/${TARGET}; recoveredRows=${payload.r.length}; remaining=${TARGET-after}`)
if (after !== TARGET) throw new Error(`[motil-movements] remaining rows after recovery: ${TARGET - after}`)
