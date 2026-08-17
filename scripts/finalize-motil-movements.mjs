import { createHash } from 'node:crypto'
import { writeFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const TRANSFER_ID='motil-movements-compact-v1'
const ORG_ID='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
const TARGET=35744
const BATCH=500

function b32(s){const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',o=[];let b=0,n=0;for(const c of s.replace(/\s+/g,'').replace(/=+$/g,'').toUpperCase()){const v=a.indexOf(c);if(v<0)throw new Error('bad b32');b=(b<<5)|v;n+=5;if(n>=8){n-=8;o.push((b>>n)&255);b&=(1<<n)-1}}return Buffer.from(o)}
function rowsFrom(text,start){const rows=[];let rs=-1,d=0,str=false,esc=false;for(let i=start;i<text.length;i++){const c=text[i];if(str){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}if(c==='"'){str=true;continue}if(c==='['){if(d===0)rs=i;d++;continue}if(c===']'){if(d>0){d--;if(d===0&&rs>=0){try{rows.push(JSON.parse(text.slice(rs,i+1)))}catch{}rs=-1}}else break}}return rows}
function isoDate(base,days){const d=new Date(`${base}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+Number(days));return d.toISOString().slice(0,10)}
function decodeRow(row,head){return row.map((v,i)=>{const dict=head.md?.[String(i)];if(dict)return dict[v]??null;if(i===1)return isoDate(head.b,v);if(i===11||i===14)return v==null?null:Number(v)/1e6;return v})}

if(process.env.VERCEL_ENV!=='production')process.exit(0)
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key)throw new Error('missing Supabase production env')
const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
async function count(){const {count,error}=await sb.from('production_material_movements').select('id',{count:'exact',head:true}).eq('organization_id',ORG_ID);if(error)throw error;return count??0}
const before=await count();console.log(`[motil-movements] canonical before: ${before}/${TARGET}`);if(before===TARGET)process.exit(0)
const {data:c,error}=await sb.from('production_canonical_transfer_chunks').select('chunk_index,payload_b64,payload_sha256').eq('transfer_id',TRANSFER_ID).order('chunk_index',{ascending:true});if(error)throw error;if(!c||c.length!==84)throw new Error(`expected 84 chunks, got ${c?.length??0}`)
for(let i=0;i<c.length;i++){if(c[i].chunk_index!==i)throw new Error(`gap ${i}`);if(createHash('sha256').update(c[i].payload_b64).digest('hex')!==c[i].payload_sha256)throw new Error(`checksum ${i}`)}
const compressed=b32(c.map(x=>x.payload_b64).join('')),tmp='/tmp/motil.xz';writeFileSync(tmp,compressed);const x=spawnSync('xz',['-dc',tmp],{encoding:null,maxBuffer:64*1024*1024});try{unlinkSync(tmp)}catch{};if(x.error)throw x.error
const text=(Buffer.isBuffer(x.stdout)?x.stdout:Buffer.from(x.stdout??'')).toString('utf8'),marker=',"m":[',p=text.indexOf(marker);if(p<0)throw new Error('m marker absent')
const head=JSON.parse(text.slice(0,p)+'}'),packed=rowsFrom(text,p+marker.length),rows=packed.map(r=>decodeRow(r,head))
console.log(`[motil-movements] recovered complete rows: ${rows.length}/${TARGET}`)
if(rows.length!==25467)throw new Error(`unexpected recovery count ${rows.length}`)
console.log(`[motil-movements] decoded first=${JSON.stringify(rows[0])}`)
let submitted=0
for(let off=0;off<rows.length;off+=BATCH){const batch=rows.slice(off,Math.min(rows.length,off+BATCH));const {data,error}=await sb.rpc('import_motil_movement_arrays',{p_rows:batch});if(error)throw new Error(`RPC offset ${off}: ${error.message}`);submitted+=Number(data??batch.length);if(off%5000===0||off+BATCH>=rows.length)console.log(`[motil-movements] progress ${Math.min(rows.length,off+BATCH)}/${rows.length}; canonical=${await count()}/${TARGET}`)}
const after=await count();console.log(`[motil-movements] recovered import complete: ${after}/${TARGET}; submitted=${submitted}; remaining=${TARGET-after}`)
