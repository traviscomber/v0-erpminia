import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const IDS=['motil-packed-v5-movements','motil-v6-movements']
const ORG_ID='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee',TARGET=35744
function printable(buf){return [...buf.subarray(0,160)].map(b=>b>=32&&b<127?String.fromCharCode(b):'.').join('')}
if(process.env.VERCEL_ENV!=='production')process.exit(0)
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('missing env');const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const {count,error:ce}=await sb.from('production_material_movements').select('id',{count:'exact',head:true}).eq('organization_id',ORG_ID);if(ce)throw ce;console.log(`[wrapper-scan] canonical=${count??0}/${TARGET}`)
for(const id of IDS){const {data:c,error}=await sb.from('production_canonical_transfer_chunks').select('chunk_index,payload_b64,payload_sha256').eq('transfer_id',id).order('chunk_index',{ascending:true});if(error)throw error;const joined=c.map(x=>x.payload_b64).join('');const raw=Buffer.from(joined+'='.repeat((4-joined.length%4)%4),'base64');console.log(`[wrapper-scan] ${id} chunks=${c.length} chars=${joined.length} raw=${raw.length} hex64=${raw.subarray(0,64).toString('hex')} ascii=${JSON.stringify(printable(raw))} rawTailHex=${raw.subarray(-64).toString('hex')} b64Prefix=${JSON.stringify(joined.slice(0,200))}`)}
throw new Error('[wrapper-scan] complete')
