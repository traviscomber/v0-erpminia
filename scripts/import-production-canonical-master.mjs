#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import pg from 'pg';
import * as XLSX from 'xlsx';

const { Client } = pg;
const ORG_DEFAULT = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';
const CHUNK = 500;

function args(argv) {
  const out = { commit: false, organizationId: ORG_DEFAULT };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--file') out.file = argv[++i];
    else if (argv[i] === '--organization-id') out.organizationId = argv[++i];
    else if (argv[i] === '--commit') out.commit = true;
    else if (argv[i] === '--help' || argv[i] === '-h') out.help = true;
    else throw new Error(`Argumento desconocido: ${argv[i]}`);
  }
  return out;
}

function help() {
  console.log(`Uso:\n  node scripts/import-production-canonical-master.mjs --file <Motil_Produccion_Ingesta_Canonica_2019_2026.xlsx> [--organization-id <uuid>] [--commit]\n\nSin --commit: valida y resume solamente.\nCon --commit: carga movimientos, excepciones, turnos y metalurgia en una sola transacción PostgreSQL.\nRequiere DATABASE_URL únicamente en modo --commit.`);
}

function text(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function date(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalized(v) {
  return text(v)?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ') || null;
}

function sha(...parts) {
  return createHash('sha256').update(parts.map((v) => v ?? '').join('|')).digest('hex');
}

function classification(description) {
  const d = normalized(description) || '';
  if (d.includes('ESTERIL')) return 'sterile';
  if (d.includes('CENIZA')) return 'ash';
  if (d.includes('MINERAL')) return 'process_mineral';
  return 'unclassified';
}

function chunks(rows, size = CHUNK) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function rowsFromSheet(workbook, sheet) {
  const ws = workbook.Sheets[sheet];
  if (!ws) throw new Error(`Falta hoja requerida: ${sheet}`);
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
}

function mapMovement(r) {
  const movementDate = date(r.FECHA);
  const sourceFile = text(r['ARCHIVO ORIGEN']);
  const sourceSheet = text(r['HOJA ORIGEN']);
  const sourceRow = num(r['FILA ORIGEN']);
  const fileSha = text(r['SHA256 ARCHIVO']);
  const movementNumber = text(r.NUMERO);
  const rawQuantity = num(r['TONELAJE NETO']);
  const normalizedTons = num(r['TONELADAS NORMALIZADAS']);
  const sourceHash = sha(fileSha, sourceSheet, sourceRow, movementNumber, movementDate, rawQuantity);
  return {
    movement_number: movementNumber,
    movement_date: movementDate,
    mine_name_raw: text(r['MINA ORIGEN']),
    sector_name_raw: text(r.SECTOR),
    driver_name_raw: text(r.CONDUCTOR),
    carrier_name_raw: text(r['EMPRESA TRANSPORTISTA']),
    vehicle_plate_raw: text(r.PATENTE),
    seal_number: text(r['NUMERO DE SELLO']),
    raw_quantity: rawQuantity,
    raw_unit: text(r['UNIDAD ORIGEN']),
    normalized_metric_tons: normalizedTons,
    normalization_status: normalizedTons !== null ? 'approved' : 'pending',
    normalization_rule: text(r['ADAPTER VERSION']),
    source_file: sourceFile,
    source_sheet: sourceSheet,
    source_row: sourceRow,
    source_hash: sourceHash,
    validation_status: movementDate && normalizedTons !== null && normalizedTons > 0 ? 'valid' : 'review',
    validation_notes: null,
    client_name_raw: text(r.CLIENTE),
    movement_description_raw: text(r.DESCRIPCION),
    interior_mine_raw: text(r['INTERIOR MINA']),
    debt_status_raw: text(r.DEUDA),
    material_classification: classification(r.DESCRIPCION),
    source_schema_version: text(r['SCHEMA ORIGEN']),
    adapter_version: text(r['ADAPTER VERSION']),
    file_sha: fileSha,
    payload: r,
  };
}

function mapException(r) {
  const movementDate = date(r.FECHA);
  const sourceFile = text(r['ARCHIVO ORIGEN']);
  const sourceSheet = text(r['HOJA ORIGEN']);
  const sourceRow = num(r['FILA ORIGEN']);
  const fileSha = text(r['SHA256 ARCHIVO']);
  const movementNumber = text(r.NUMERO);
  const rawQuantity = num(r['TONELAJE NETO']);
  return {
    exception_type: rawQuantity === 0 ? 'zero_tonnage' : 'other',
    reason: text(r['MOTIVO REVISION']) || 'Requiere revisión de fuente',
    movement_number: movementNumber,
    movement_date: movementDate,
    source_file: sourceFile,
    source_sheet: sourceSheet,
    source_row: sourceRow,
    source_hash: sha('EXCEPTION', fileSha, sourceSheet, sourceRow, movementNumber, movementDate, rawQuantity),
    file_sha: fileSha,
    payload: r,
  };
}

function calcPlant(r) {
  const operationDate = date(r.FECHA);
  const shift = text(r.TURNO);
  const wet = num(r['MINERAL HUMEDO t']);
  const mineralMoisture = num(r['HUMEDAD MINERAL %']);
  const head = num(r['LEY CABEZA %']);
  const galigher = num(r['LEY GALIGHER %']);
  const concentrateGrade = num(r['LEY CONCENTRADO %']);
  const tail = num(r['LEY RELAVE %']);
  const recoveryReported = num(r['RECUPERACION REPORTADA %']);
  const fineReported = num(r['FINO TRATADO REPORTADO t']);
  const concentrateMoisture = num(r['HUMEDAD CONCENTRADO %']);
  const dispatchGrade = num(r['LEY DESPACHO %']);
  const dispatchWet = num(r['DESPACHO HUMEDO t']);
  const dispatchFineReported = num(r['FINO DESPACHADO REPORTADO t']);
  const mineralDry = wet !== null && mineralMoisture !== null ? wet * (1 - mineralMoisture / 100) : null;
  const feedFine = mineralDry !== null && head !== null ? mineralDry * head / 100 : null;
  const recovery = head !== null && concentrateGrade !== null && tail !== null && head !== 0 && concentrateGrade !== tail
    ? ((head - tail) * concentrateGrade) / ((concentrateGrade - tail) * head) * 100
    : null;
  const dispatchDry = dispatchWet !== null && concentrateMoisture !== null ? dispatchWet * (1 - concentrateMoisture / 100) : null;
  const dispatchFine = dispatchDry !== null && dispatchGrade !== null ? dispatchDry * dispatchGrade / 100 : null;
  const fileSha = text(r['SHA256 ARCHIVO']);
  const sourceFile = text(r['ARCHIVO ORIGEN']);
  const sourceSheet = text(r['HOJA ORIGEN']);
  const sourceRow = num(r['FILA ORIGEN']);
  const baseHash = sha(fileSha, sourceSheet, sourceRow, operationDate, shift);
  const partial = wet === null || mineralMoisture === null || head === null;
  return {
    shift: {
      operation_date: operationDate,
      shift_code: shift,
      raw_treated_quantity: wet,
      raw_treated_unit: 't',
      treated_metric_tons: wet,
      normalization_status: wet !== null ? 'not_required' : 'pending',
      normalization_rule: 'PLANT_TONNES_V1',
      source_file: sourceFile,
      source_sheet: sourceSheet,
      source_row: sourceRow,
      source_hash: baseHash,
      validation_status: partial ? 'review' : 'valid',
      validation_notes: partial ? 'Turno parcial: faltan tonelaje, humedad mineral o ley cabeza' : null,
      mineral_moisture_pct: mineralMoisture,
      lot_number_raw: text(r.LOTE),
      blend_code_raw: null,
      source_schema_version: text(r['SCHEMA ORIGEN']),
      adapter_version: 'PLANT_MASTER_V1',
      file_sha: fileSha,
      payload: r,
    },
    metallurgy: {
      head_grade: head,
      concentrate_grade: concentrateGrade,
      tailings_grade: tail,
      recovery_reported: recoveryReported,
      recovery_calculated: recovery,
      fine_metal_reported: fineReported,
      fine_metal_calculated: feedFine,
      concentrate_quantity: null,
      concentrate_quantity_unit: null,
      analysis_status: partial ? 'partial' : 'calculated',
      calculation_rule_version: 'METALLURGY_DRY_BASIS_V1',
      source_file: sourceFile,
      source_sheet: sourceSheet,
      source_row: sourceRow,
      source_hash: sha('MET', baseHash),
      validation_status: partial ? 'review' : 'valid',
      validation_notes: operationDate === '2026-08-06' && (head === null || concentrateGrade === null || tail === null)
        ? '06-08-2026: tonelaje observado con leyes incompletas; no interpretar como cero'
        : null,
      dispatch_moisture: concentrateMoisture,
      dispatch_grade: dispatchGrade,
      dispatched_quantity_raw: dispatchWet,
      dispatched_quantity_unit: dispatchWet !== null ? 't' : null,
      galigher_grade: galigher,
      dispatched_metric_tons: dispatchWet,
      concentrate_wet_metric_tons: null,
      concentrate_moisture_pct: concentrateMoisture,
      dispatch_fine_reported: dispatchFineReported,
      dispatch_fine_calculated: dispatchFine,
      payload: r,
    },
  };
}

async function batchMap(client, organizationId) {
  const q = await client.query(`select id, source_file, source_file_sha256 from public.production_import_batches where organization_id=$1`, [organizationId]);
  return new Map(q.rows.map((r) => [`${r.source_file}|${r.source_file_sha256}`, r.id]));
}

async function insertJson(client, table, columns, rows, conflict = 'do nothing') {
  for (const part of chunks(rows)) {
    const json = JSON.stringify(part);
    const defs = columns.map(([name, type]) => `${name} ${type}`).join(', ');
    const names = columns.map(([name]) => name).join(', ');
    const selects = columns.map(([name]) => `x.${name}`).join(', ');
    await client.query(`insert into ${table} (${names}) select ${selects} from jsonb_to_recordset($1::jsonb) as x(${defs}) on conflict ${conflict}`, [json]);
  }
}

function reconciliationRows(organizationId, movements) {
  const seen = new Map();
  const add = (type, raw) => {
    const n = normalized(raw);
    if (!n) return;
    const key = `${type}|${n}`;
    if (!seen.has(key)) seen.set(key, { organization_id: organizationId, entity_type: type, raw_value: raw, normalized_value: n, status: 'pending', confidence: null, evidence: 'Importación canónica histórica; requiere reconciliación humana o match verificable.' });
  };
  for (const r of movements) {
    add('driver', r.driver_name_raw); add('carrier', r.carrier_name_raw); add('vehicle', r.vehicle_plate_raw); add('mine', r.mine_name_raw); add('sector', r.sector_name_raw);
  }
  return [...seen.values()];
}

async function main() {
  const a = args(process.argv.slice(2));
  if (a.help) return help();
  if (!a.file) throw new Error('Falta --file');
  const bytes = await readFile(a.file);
  const masterSha = createHash('sha256').update(bytes).digest('hex');
  const wb = XLSX.read(bytes, { type: 'buffer', cellDates: true, cellFormula: true });
  const movements = rowsFromSheet(wb, 'TRANSPORTE_CANONICO').map(mapMovement);
  const exceptions = rowsFromSheet(wb, 'TRANSPORTE_REVISAR').map(mapException);
  const plants = rowsFromSheet(wb, 'PLANTA_LEYES_CANONICO').map(calcPlant);
  const invalidMovements = movements.filter((r) => !r.movement_date || !r.source_file || !r.source_sheet || !r.source_row || !r.file_sha || r.normalized_metric_tons === null || r.normalized_metric_tons <= 0);
  const invalidPlants = plants.filter((r) => !r.shift.operation_date || !r.shift.shift_code || !r.shift.source_file || !r.shift.source_row || !r.shift.file_sha);
  const summary = {
    mode: a.commit ? 'commit' : 'dry-run', masterSha, movements: movements.length, exceptions: exceptions.length,
    plantShifts: plants.length, invalidMovements: invalidMovements.length, invalidPlants: invalidPlants.length,
    latestMovement: movements.map((r) => r.movement_date).filter(Boolean).sort().at(-1),
    latestPlant: plants.map((r) => r.shift.operation_date).filter(Boolean).sort().at(-1),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!a.commit) return;
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
  if (invalidMovements.length || invalidPlants.length) throw new Error('Dry-run detectó filas estructuralmente inválidas; no se ejecuta commit.');

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('begin');
    const batches = await batchMap(client, a.organizationId);
    const getBatch = (row) => {
      const id = batches.get(`${row.source_file}|${row.file_sha}`);
      if (!id) throw new Error(`No existe batch para ${row.source_file} / ${row.file_sha}`);
      return id;
    };

    const movementRows = movements.map((r) => ({ organization_id: a.organizationId, import_batch_id: getBatch(r), ...r, source_payload: r.payload })).map(({ file_sha, payload, ...r }) => r);
    await insertJson(client, 'public.production_material_movements', [
      ['organization_id','uuid'],['import_batch_id','uuid'],['movement_number','text'],['movement_date','date'],['mine_name_raw','text'],['sector_name_raw','text'],['driver_name_raw','text'],['carrier_name_raw','text'],['vehicle_plate_raw','text'],['seal_number','text'],['raw_quantity','numeric'],['raw_unit','text'],['normalized_metric_tons','numeric'],['normalization_status','text'],['normalization_rule','text'],['source_file','text'],['source_sheet','text'],['source_row','integer'],['source_hash','text'],['source_payload','jsonb'],['validation_status','text'],['validation_notes','text'],['client_name_raw','text'],['movement_description_raw','text'],['interior_mine_raw','text'],['debt_status_raw','text'],['material_classification','text'],['source_schema_version','text'],['adapter_version','text']
    ], movementRows);

    const exceptionRows = exceptions.map((r) => ({ organization_id: a.organizationId, import_batch_id: getBatch(r), ...r, source_payload: r.payload })).map(({ file_sha, payload, ...r }) => r);
    await insertJson(client, 'public.production_import_exceptions', [
      ['organization_id','uuid'],['import_batch_id','uuid'],['exception_type','text'],['reason','text'],['movement_number','text'],['movement_date','date'],['source_file','text'],['source_sheet','text'],['source_row','integer'],['source_hash','text'],['source_payload','jsonb']
    ], exceptionRows);

    for (const part of chunks(plants)) {
      for (const p of part) {
        const batchId = getBatch(p.shift);
        const shiftPayload = p.shift.payload;
        const s = p.shift;
        const inserted = await client.query(`insert into public.production_plant_shifts (organization_id,import_batch_id,operation_date,shift_code,raw_treated_quantity,raw_treated_unit,treated_metric_tons,normalization_status,normalization_rule,source_file,source_sheet,source_row,source_hash,source_payload,validation_status,validation_notes,mineral_moisture_pct,lot_number_raw,blend_code_raw,source_schema_version,adapter_version) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20,$21) on conflict (organization_id,source_hash) do update set updated_at=now() returning id`, [a.organizationId,batchId,s.operation_date,s.shift_code,s.raw_treated_quantity,s.raw_treated_unit,s.treated_metric_tons,s.normalization_status,s.normalization_rule,s.source_file,s.source_sheet,s.source_row,s.source_hash,JSON.stringify(shiftPayload),s.validation_status,s.validation_notes,s.mineral_moisture_pct,s.lot_number_raw,s.blend_code_raw,s.source_schema_version,s.adapter_version]);
        const plantShiftId = inserted.rows[0].id;
        const m = p.metallurgy;
        await client.query(`insert into public.production_metallurgy_results (organization_id,plant_shift_id,head_grade,concentrate_grade,tailings_grade,recovery_reported,recovery_calculated,fine_metal_reported,fine_metal_calculated,concentrate_quantity,concentrate_quantity_unit,analysis_status,calculation_rule_version,source_file,source_sheet,source_row,source_hash,source_payload,validation_status,validation_notes,dispatch_moisture,dispatch_grade,dispatched_quantity_raw,dispatched_quantity_unit,galigher_grade,dispatched_metric_tons,concentrate_wet_metric_tons,concentrate_moisture_pct) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) on conflict (organization_id,plant_shift_id) do update set updated_at=now()`, [a.organizationId,plantShiftId,m.head_grade,m.concentrate_grade,m.tailings_grade,m.recovery_reported,m.recovery_calculated,m.fine_metal_reported,m.fine_metal_calculated,m.concentrate_quantity,m.concentrate_quantity_unit,m.analysis_status,m.calculation_rule_version,m.source_file,m.source_sheet,m.source_row,m.source_hash,JSON.stringify({...m.payload,dispatch_fine_reported:m.dispatch_fine_reported,dispatch_fine_calculated:m.dispatch_fine_calculated}),m.validation_status,m.validation_notes,m.dispatch_moisture,m.dispatch_grade,m.dispatched_quantity_raw,m.dispatched_quantity_unit,m.galigher_grade,m.dispatched_metric_tons,m.concentrate_wet_metric_tons,m.concentrate_moisture_pct]);
      }
    }

    const recon = reconciliationRows(a.organizationId, movements);
    await insertJson(client, 'public.production_entity_reconciliation', [['organization_id','uuid'],['entity_type','text'],['raw_value','text'],['normalized_value','text'],['status','text'],['confidence','text'],['evidence','text']], recon, '(organization_id,entity_type,normalized_value) do nothing');

    const touchedBatchIds = [...new Set([...movementRows.map((r) => r.import_batch_id), ...exceptionRows.map((r) => r.import_batch_id), ...plants.map((p) => getBatch(p.shift))])];
    await client.query(`update public.production_import_batches set status='imported', updated_at=now(), notes=coalesce(notes,'') || E'\nCarga ejecutada desde workbook maestro canónico; master_sha256=${masterSha}.' where id = any($1::uuid[])`, [touchedBatchIds]);
    await client.query('commit');
    console.log(JSON.stringify({ ...summary, committed: true, reconciliationCandidates: recon.length }, null, 2));
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
