import { createHash } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const IDS = [
  'motil-final-b32-10k-v1','motil-final-b32-v1','motil-final-dict-v1','motil-final-dict-v2-10k',
  'motil-final-gzip-v1','motil-final-xz-v1','motil-production-master-full-v2','motil-production-master-v3','motil-v5style-final'
]
const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function b32(s){const o=[];let b=0,n=0;for(const c of s.replace(/\s+/g,'').replace(/=+$/g,'').toUpperCase()){const v=A.indexOf(c);if(v<0)return null;b=(b<<5)|v;n+=5;if(n>=8){n-=8;o.push((b>>n)&255);b&=(1<<n)-1}}return Buffer.from(o)}
function decode(joined){if(/^[A-Z2-7=\s]+$/.test(joined)){const x=b32(joined);if(x)return {enc:'base32',raw:x}}return {enc:'base64',raw:Buffer.from(joined+'='.repeat((4-joined.length%4)%4),'base64')}}
function unpack(raw,id){const hex=raw.subarray(0,13).toString('hex');let cmd,args,ext;
 if(hex.startsWith('fd377a585a00')){cmd='xz';args=['-dc'];ext='xz'}
 else if(hex.startsWith('1f8b')){cmd='gzip';args=['-dc'];ext='gz'}
 else if(hex.startsWith('5d00000004')){cmd='xz';args=['--format=lzma','-dc'];ext='lzma'}
 else return {kind:'raw',status:null,stderr:'',text:raw.toString('utf8')}
 const p=`/tmp/${id.replace(/[^a-z0-9]/gi,'_')}.${ext}`;writeFileSync(p,raw);const r=spawnSync(cmd,[...args,p],{encoding:null,maxBuffer:64*1024*1024});try{unlinkSync(p)}catch{};return {kind:ext,status:r.status,stderr:(r.stderr||Buffer.alloc(0)).toString().trim(),text:(r.stdout||Buffer.alloc(0)).toString('utf8')}
}
function summarize(text){const keys=['PLANTA_LEYES_CANONICO','plant','plants','metallurgy','movements','exceptions','"p"','"m"','"r"'];const marks={};for(const k of keys)marks[k]=text.indexOf(k);let parsed=null;try{parsed=JSON.parse(text)}catch{};let shape=null;if(parsed){shape=Array.isArray(parsed)?`array:${parsed.length}`:Object.fromEntries(Object.entries(parsed).map(([k,v])=>[k,Array.isArray(v)?`array:${v.length}`:typeof v]))}return {bytes:Buffer.byteLength(text),prefix:text.slice(0,700),tail:text.slice(-400),marks,shape}}

if(process.env.VERCEL_ENV!=='production')process.exit(0)
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key)throw new Error('missing supabase env')
const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
for(const id of IDS){const {data:c,error}=await sb.from('production_canonical_transfer_chunks').select('chunk_index,payload_b64,payload_sha256').eq('transfer_id',id).order('chunk_index');if(error){console.log('[plant-scan]',id,'query',error.message);continue}if(!c?.length){console.log('[plant-scan]',id,'absent');continue}let valid=true;for(let i=0;i<c.length;i++){if(c[i].chunk_index!==i||createHash('sha256').update(c[i].payload_b64).digest('hex')!==c[i].payload_sha256){valid=false;break}}const joined=c.map(x=>x.payload_b64).join('');const {enc,raw}=decode(joined);const u=unpack(raw,id);console.log('[plant-scan]',JSON.stringify({id,chunks:c.length,chars:joined.length,valid,enc,raw:raw.length,kind:u.kind,status:u.status,stderr:u.stderr.slice(0,140),...summarize(u.text)}))}
throw new Error('[plant-scan] complete')
