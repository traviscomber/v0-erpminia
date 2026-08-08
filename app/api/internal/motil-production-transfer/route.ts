export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { createHash } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TRANSFER_ID = 'motil-production-2019-2026-v1';
const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';
const EXPECTED_COMPRESSED_SHA = 'cf862c5f9962429da88200d12957eecc8558d627c61ada40c923525dcf30f67f';
const EXPECTED = { movements: 35744, exceptions: 3165, plants: 11171 };
const SOURCE_SHA = new Map([
  ['TM - 2019.xlsx','43ff4fbc3dc85d349641aa054932b410daff1fdab57cb39addf9dab9d11f0b32'],
  ['TM - 2020.xlsx','0c0f716c2d3aa1bd1c156cb3058a47f014b79a756352a228105eb2e30b476452'],
  ['TM - 2021.xlsx','8fc92e17d020b755b0db20667ffd41e161e74408127d7fb438ea0d409ea47139'],
  ['TM - 2022.xlsx','6c0312cf30e3e0252641eb2bc18a6ac571f8403459f82f4cebe45290249d0010'],
  ['TM-2023.xlsx','a88c87e088a91160bbe78164c9324e6aa8f59cc8ca8a1e9d6f22c0ae757429c9'],
  ['TM-2024 actualizado.xlsx','fd51c112e23a30ea4c614073f7ceaaf88d6e6de50337d02a6bca35772aaa7aa9'],
  ['TM 2025 actualizado (31-12-2025).xlsx','2129860d6ce77469289d95f76fded63f5dbf2212e0deaecc4ed243c5fc237ff4'],
  ['TM 2026 actualizado (06-08-2026).xlsx','dbc1b28a68f0faa269fca43dfc127823ef3d1f4155274a152cad7a3c166f6b00'],
  ['LEY.xlsx','9235bc3b4b379bc131187cf2b255ce5584f64623c3b5d14c75630a9a2ddf8618'],
  ['LEYES.xlsx','dc7d5a35a55bb117ae8bb4e512d3c2be99b87b3ea981ec0fc43ba2f764043a3f'],
]);

type Matrix = [string[], unknown[][]];
type Payload = Record<'TRANSPORTE_CANONICO'|'TRANSPORTE_REVISAR'|'PLANTA_LEYES_CANONICO', Matrix>;

function txt(v: unknown) { const s = v == null ? '' : String(v).trim(); return s || null; }
function num(v: unknown) { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function iso(v: unknown) { const s = txt(v); return s ? s.slice(0,10) : null; }
function norm(v: unknown) { return (txt(v) || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' '); }
function h(...p: unknown[]) { return createHash('sha256').update(p.map(v => v ?? '').join('|')).digest('hex'); }
function classify(v: unknown) { const d=norm(v); if(d.includes('ESTERIL'))return 'sterile'; if(d.includes('CENIZA'))return 'ash'; if(d.includes('MINERAL'))return 'process_mineral'; return 'unclassified'; }
function records(matrix: Matrix) { const [headers, rows]=matrix; return rows.map(row => Object.fromEntries(headers.map((key,i)=>[key,row[i] ?? null]))); }
function allowed(r: Record<string,unknown>) { const f=txt(r['ARCHIVO ORIGEN']); const s=txt(r['SHA256 ARCHIVO']); return !!f && SOURCE_SHA.get(f) === s; }
async function batches(sb: Awaited<ReturnType<typeof createClient>>) { const {data,error}=await sb.from('production_import_batches').select('id,source_file,source_file_sha256').eq('organization_id',ORG_ID).eq('project_key','motil').eq('domain_key','production'); if(error)throw error; return new Map((data||[]).map(r=>[`${r.source_file}|${r.source_file_sha256}`,r.id])); }
async function upsertParts(sb: Awaited<ReturnType<typeof createClient>>, table:string, rows:Record<string,unknown>[], onConflict:string) { for(let i=0;i<rows.length;i+=250){ const {error}=await sb.from(table).upsert(rows.slice(i,i+250),{onConflict,ignoreDuplicates:true}); if(error)throw error; } }

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'motil-production-transfer-20260808') return NextResponse.json({error:'not available'},{status:404});
  const sb=await createClient();
  const {data:chunks,error:chunkError}=await sb.from('production_canonical_transfer_chunks').select('chunk_index,payload_b64,payload_sha256').eq('transfer_id',TRANSFER_ID).order('chunk_index');
  if(chunkError) return NextResponse.json({error:chunkError.message},{status:500});
  if(!chunks?.length) return NextResponse.json({error:'transfer payload missing'},{status:409});
  for(const c of chunks){ if(createHash('sha256').update(c.payload_b64).digest('hex')!==c.payload_sha256) return NextResponse.json({error:`chunk checksum failed ${c.chunk_index}`},{status:409}); }
  const joined=chunks.map(c=>c.payload_b64).join('');
  const pad='='.repeat((4-(joined.length%4))%4);
  const compressed=Buffer.from(joined.replace(/-/g,'+').replace(/_/g,'/')+pad,'base64');
  if(createHash('sha256').update(compressed).digest('hex')!==EXPECTED_COMPRESSED_SHA) return NextResponse.json({error:'compressed payload checksum failed'},{status:409});
  let payload:Payload;
  try { payload=JSON.parse(brotliDecompressSync(compressed).toString('utf8')) as Payload; } catch { return NextResponse.json({error:'payload decode failed'},{status:409}); }
  const movements=records(payload.TRANSPORTE_CANONICO); const exceptions=records(payload.TRANSPORTE_REVISAR); const plants=records(payload.PLANTA_LEYES_CANONICO);
  if(movements.length!==EXPECTED.movements||exceptions.length!==EXPECTED.exceptions||plants.length!==EXPECTED.plants) return NextResponse.json({error:'canonical row counts mismatch'},{status:409});
  if([...movements,...exceptions,...plants].some(r=>!allowed(r))) return NextResponse.json({error:'source allowlist mismatch'},{status:409});
  const bm=await batches(sb); if(bm.size!==10) return NextResponse.json({error:`expected 10 batches, found ${bm.size}`},{status:409});
  const batchId=(r:Record<string,unknown>)=>{const id=bm.get(`${txt(r['ARCHIVO ORIGEN'])}|${txt(r['SHA256 ARCHIVO'])}`); if(!id)throw new Error('batch not found'); return id;};

  const movementRows=movements.map(r=>{ const d=iso(r.FECHA)!; const f=txt(r['ARCHIVO ORIGEN'])!; const sh=txt(r['HOJA ORIGEN'])!; const sr=num(r['FILA ORIGEN'])!; const fs=txt(r['SHA256 ARCHIVO'])!; const mn=txt(r.NUMERO); const rq=num(r['TONELAJE NETO'])!; return {organization_id:ORG_ID,import_batch_id:batchId(r),movement_number:mn,movement_date:d,mine_name_raw:txt(r['MINA ORIGEN']),sector_name_raw:txt(r.SECTOR),driver_name_raw:txt(r.CONDUCTOR),carrier_name_raw:txt(r['EMPRESA TRANSPORTISTA']),vehicle_plate_raw:txt(r.PATENTE),seal_number:txt(r['NUMERO DE SELLO']),raw_quantity:rq,raw_unit:txt(r['UNIDAD ORIGEN']),normalized_metric_tons:num(r['TONELADAS NORMALIZADAS']),normalization_status:'approved',normalization_rule:txt(r['ADAPTER VERSION']),source_file:f,source_sheet:sh,source_row:sr,source_hash:h(fs,sh,sr,mn,d,rq),source_payload:r,validation_status:'valid',validation_notes:'Master canónico Motil validado por archivo y SHA-256.',client_name_raw:txt(r.CLIENTE),movement_description_raw:txt(r.DESCRIPCION),interior_mine_raw:txt(r['INTERIOR MINA']),debt_status_raw:txt(r.DEUDA),material_classification:classify(r.DESCRIPCION),source_schema_version:txt(r['SCHEMA ORIGEN']),adapter_version:txt(r['ADAPTER VERSION'])}; });
  const exceptionRows=exceptions.map(r=>{ const d=iso(r.FECHA); const f=txt(r['ARCHIVO ORIGEN'])!; const sh=txt(r['HOJA ORIGEN'])!; const sr=num(r['FILA ORIGEN'])!; const fs=txt(r['SHA256 ARCHIVO'])!; const mn=txt(r.NUMERO); const rq=num(r['TONELAJE NETO']); return {organization_id:ORG_ID,import_batch_id:batchId(r),exception_type:rq===0?'zero_tonnage':'other',reason:txt(r['MOTIVO REVISION'])||'Requiere revisión de fuente',movement_number:mn,movement_date:d,source_file:f,source_sheet:sh,source_row:sr,source_hash:h('EXCEPTION',fs,sh,sr,mn,d,rq),source_payload:r,review_status:'pending'}; });
  const plantMapped=plants.map(r=>{ const d=iso(r.FECHA)!; const shift=txt(r.TURNO)!; const wet=num(r['MINERAL HUMEDO t']); const mm=num(r['HUMEDAD MINERAL %']); const head=num(r['LEY CABEZA %']); const cg=num(r['LEY CONCENTRADO %']); const tail=num(r['LEY RELAVE %']); const cm=num(r['HUMEDAD CONCENTRADO %']); const dg=num(r['LEY DESPACHO %']); const dw=num(r['DESPACHO HUMEDO t']); const dry=wet!=null&&mm!=null?wet*(1-mm/100):null; const fine=dry!=null&&head!=null?dry*head/100:null; const rec=head!=null&&cg!=null&&tail!=null&&head!==0&&cg!==tail?((head-tail)*cg)/((cg-tail)*head)*100:null; const dd=dw!=null&&cm!=null?dw*(1-cm/100):null; const f=txt(r['ARCHIVO ORIGEN'])!; const sh=txt(r['HOJA ORIGEN'])!; const sr=num(r['FILA ORIGEN'])!; const fs=txt(r['SHA256 ARCHIVO'])!; const base=h(fs,sh,sr,d,shift); const partial=wet==null||mm==null||head==null; return {r,base,shiftRow:{organization_id:ORG_ID,import_batch_id:batchId(r),operation_date:d,shift_code:shift,raw_treated_quantity:wet,raw_treated_unit:'t',treated_metric_tons:wet,normalization_status:wet!=null?'not_required':'pending',normalization_rule:'PLANT_TONNES_V1',source_file:f,source_sheet:sh,source_row:sr,source_hash:base,source_payload:r,validation_status:partial?'review':'valid',validation_notes:partial?'Turno parcial: faltan tonelaje, humedad mineral o ley cabeza':null,mineral_moisture_pct:mm,lot_number_raw:txt(r.LOTE),blend_code_raw:null,source_schema_version:txt(r['SCHEMA ORIGEN']),adapter_version:'PLANT_MASTER_V1'},met:{head_grade:head,concentrate_grade:cg,tailings_grade:tail,recovery_reported:num(r['RECUPERACION REPORTADA %']),recovery_calculated:rec,fine_metal_reported:num(r['FINO TRATADO REPORTADO t']),fine_metal_calculated:fine,concentrate_quantity:null,concentrate_quantity_unit:null,analysis_status:partial?'partial':'calculated',calculation_rule_version:'METALLURGY_DRY_BASIS_V1',source_file:f,source_sheet:sh,source_row:sr,source_hash:h('MET',base),source_payload:r,validation_status:partial?'review':'valid',validation_notes:d==='2026-08-06'&&(head==null||cg==null||tail==null)?'06-08-2026: tonelaje observado con leyes incompletas; no interpretar como cero':null,dispatch_moisture:cm,dispatch_grade:dg,dispatched_quantity_raw:dw,dispatched_quantity_unit:dw!=null?'t':null,galigher_grade:num(r['LEY GALIGHER %']),dispatched_metric_tons:dw,concentrate_wet_metric_tons:null,concentrate_moisture_pct:cm}}; });

  try {
    await upsertParts(sb,'production_material_movements',movementRows,'organization_id,source_hash');
    await upsertParts(sb,'production_import_exceptions',exceptionRows,'organization_id,source_hash');
    for(let i=0;i<plantMapped.length;i+=200){ const part=plantMapped.slice(i,i+200); const {data:sd,error:se}=await sb.from('production_plant_shifts').upsert(part.map(x=>x.shiftRow),{onConflict:'organization_id,source_hash'}).select('id,source_hash'); if(se)throw se; const ids=new Map((sd||[]).map(x=>[x.source_hash,x.id])); const mets=part.map(x=>({organization_id:ORG_ID,plant_shift_id:ids.get(x.base),...x.met})); if(mets.some(x=>!x.plant_shift_id))throw new Error('plant shift id resolution failed'); const {error:me}=await sb.from('production_metallurgy_results').upsert(mets,{onConflict:'organization_id,source_hash'}); if(me)throw me; }
    const count=async(table:string)=>{const {count,error}=await sb.from(table).select('*',{count:'exact',head:true}).eq('organization_id',ORG_ID);if(error)throw error;return count||0;};
    const final={movements:await count('production_material_movements'),exceptions:await count('production_import_exceptions'),plants:await count('production_plant_shifts'),metallurgy:await count('production_metallurgy_results')};
    if(final.movements!==EXPECTED.movements||final.exceptions!==EXPECTED.exceptions||final.plants!==EXPECTED.plants||final.metallurgy!==EXPECTED.plants) return NextResponse.json({error:'final reconciliation failed',final},{status:409});
    const {error:be}=await sb.from('production_import_batches').update({status:'imported',updated_at:new Date().toISOString()}).eq('organization_id',ORG_ID).eq('project_key','motil').eq('domain_key','production'); if(be)throw be;
    return NextResponse.json({ok:true,final,sources:SOURCE_SHA.size});
  } catch(error){ return NextResponse.json({error:error instanceof Error?error.message:'transfer failed'},{status:500}); }
}
