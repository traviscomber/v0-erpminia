import { createHash } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const TRANSFER_ID = 'motil-movements-compact-v1'
const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
const TARGET = 35744
const EXPECTED_CHUNKS = 84
const EXPECTED_ENCODED_CHARS = 420000

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

if (process.env.VERCEL_ENV !== 'production') process.exit(0)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('[motil-movements] missing Supabase production environment')
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const { count: before, error: countError } = await supabase.from('production_material_movements').select('id',{count:'exact',head:true}).eq('organization_id',ORG_ID)
if (countError) throw countError
console.log(`[motil-movements] canonical before: ${before ?? 0}/${TARGET}`)
const { data: chunks, error: chunkError } = await supabase.from('production_canonical_transfer_chunks').select('chunk_index,payload_b64,payload_sha256').eq('transfer_id',TRANSFER_ID).order('chunk_index',{ascending:true})
if (chunkError) throw chunkError
if (!chunks || chunks.length !== EXPECTED_CHUNKS) throw new Error(`[motil-movements] expected ${EXPECTED_CHUNKS} chunks, found ${chunks?.length ?? 0}`)
for (let i=0;i<chunks.length;i+=1) {
  if (chunks[i].chunk_index !== i) throw new Error(`[motil-movements] staging gap at chunk ${i}`)
  const h=createHash('sha256').update(chunks[i].payload_b64).digest('hex')
  if (h!==chunks[i].payload_sha256) throw new Error(`[motil-movements] checksum failed ${i}`)
}
const encoded=chunks.map(x=>x.payload_b64).join('')
if(encoded.length!==EXPECTED_ENCODED_CHARS) throw new Error(`[motil-movements] encoded chars ${encoded.length}`)
const compressed=base32Decode(encoded)
const tmp='/tmp/motil-movements-truncated.xz'
writeFileSync(tmp,compressed)
const xz=spawnSync('xz',['-dc',tmp],{encoding:null,maxBuffer:64*1024*1024})
try{unlinkSync(tmp)}catch{}
if(xz.error) throw xz.error
const recovered=Buffer.isBuffer(xz.stdout)?xz.stdout:Buffer.from(xz.stdout??'')
const text=recovered.toString('utf8')
console.log(`[motil-movements] xz exit=${xz.status}; recovered=${recovered.length}; prefix=${JSON.stringify(text.slice(0,1200))}`)
for (const marker of ['"r"','"rows"','"d"','"dictionary"','"data"','"movements"']) console.log(`[motil-movements] marker ${marker} -> ${text.indexOf(marker)}`)
throw new Error('[motil-movements] inspection complete')
