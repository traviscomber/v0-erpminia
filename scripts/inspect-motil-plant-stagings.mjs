import { createHash } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const IDS=['motil-base62-v1','motil-exelito-v11','motil-compact-ops-v5']
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function b32(s){const o=[];let b=0,n=0;for(const c of s.replace(/\s+/g,'').replace(/=+$/g,'').toUpperCase()){const v=B32.indexOf(c);if(v<0)return null;b=(b<<5)|v;n+=5;if(n>=8){n-=8;o.push((b>>n)&255);b&=(1<<n)-1}}return Buffer.from(o)}
function b62(s,alphabet){let n=0n;for(const ch of s){const v=alphabet.indexOf(ch);if(v<0)return null;n=n*62n+BigInt(v)}let hex=n.toString(16);if(hex.length%2)hex='0'+hex;return Buffer.from(hex,'hex')}
function unpack(raw,id){const hex=raw.subarray(0,13).toString('hex');let cmd,args,ext;if(hex.startsWith('fd377a585a00')){cmd='xz';args=['-dc'];ext='xz'}else if(hex.startsWith('1f8b')){cmd='gzip';args=['-dc'];ext='gz'}else if(hex.startsWith('5d00000004')){cmd='xz';args=['--format=lzma','-dc'];ext='lzma'}else return {kind:'raw',status:null,stderr:'',out:raw};const p=`/tmp/${id.replace(/[^a-z0-9]/gi,'_')}.${ext}`;writeFileSync(p,raw);const r=spawnSync(cmd,[...args,p],{encoding:null,maxBuffer:64*1024*1024});try{unlinkSync(p)}catch{};return {kind:ext,status:r.status,stderr:(r.stderr||Buffer.alloc(0)).toString().trim(),out:r.stdout||Buffer.alloc(0)}}
function inspect(raw,id,label){const u=unpack(raw,id+'_'+label),text=u.out.toString('utf8');return {label,raw:raw.length,hex:raw.subarray(0,16).toString('hex'),kind:u.kind,status:u.status,stderr:u.stderr.slice(0,100),out:u.out.length,prefix:text.slice(0,500),plant:text.indexOf('PLANTA'),pkey:text.indexOf('"p"'),tkey:text.indexOf('"t"')}}
if(process.env.VERCEL_ENV!=='production')process.exit(0)
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('missing env');const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
for(const id of IDS){const {data:c,error}=await sb.from('production_canonical_transfer_chunks').select('chunk_index,payload_b64,payload_sha256').eq('transfer_id',id).order('chunk_index');if(error)throw error;if(!c?.length)continue;let valid=true;for(let i=0;i<c.length;i++)if(c[i].chunk_index!==i||createHash('sha256').update(c[i].payload_b64).digest('hex')!==c[i].payload_sha256)valid=false;const joined=c.map(x=>x.payload_b64).join('');const tests=[];if(/^[A-Z2-7=]+$/.test(joined)){const r=b32(joined);if(r)tests.push(inspect(r,id,'base32'))}else{for(const alpha of ['0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz','0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789']){const r=b62(c[0].payload_b64,alpha);if(r)tests.push(inspect(r,id,'base62-first-'+alpha.slice(0,3)))}}
console.log('[b62-scan]',JSON.stringify({id,chunks:c.length,chars:joined.length,valid,firstChars:c[0].payload_b64.length,tests}))}
throw new Error('[b62-scan] complete')
