import fs from 'node:fs';
import crypto from 'node:crypto';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_SHA256 = '890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50';
const EXPECTED_VALID_ROWS = 4693;
const EXPECTED_BLANK_ID_SOURCE_ROW = 2655;
const EXPECTED_HEADERS = [
  'ID', 'Fecha Inicio', 'Información', 'Pozo', 'Equipo', 'Faena', 'Turno', 'Operador', 'Ayudante', 'Ayudante2',
  'Diametro', 'Ubicación', 'Inclinación', 'Metro Inicial', 'Metro Final', 'Metros Perforados', 'Cantidad Cajas', 'Checklist',
  'Revise el estado de:', '1. Marque si presenta falla', '2. Marque si presenta falla', '3. Marque si presenta falla',
  '4. Marque si presenta falla', 'Observaciones', 'Operación', 'Instalación/Desarme', 'Equipo sin operador/Ayudante',
  'Falta Electricidad', 'Acuñadura', 'Falta de Agua', 'Observaciones Máquina', 'Observaciones Perforación', 'Estado Equipo',
  'Firma Operador', 'Mina', 'Sector', 'Total Bandejas Postura Final Turno',
];

const workbookPath = process.argv[2];
if (!workbookPath) {
  console.error('Usage: npm run canonical:drilling -- /path/to/Reporte_Sondajes_I_A.xlsx');
  process.exit(2);
}
if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${workbookPath}`);

const bytes = fs.readFileSync(workbookPath);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`Canonical workbook hash mismatch. Expected ${EXPECTED_SHA256}, got ${sha256}`);
}

const workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true, raw: true });
const sheet = workbook.Sheets.BaseDatos;
if (!sheet) throw new Error('Missing required sheet: BaseDatos');

const matrix = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  raw: true,
  defval: null,
  blankrows: false,
});
if (!matrix.length) throw new Error('BaseDatos is empty');

const headers = matrix[0].slice(0, EXPECTED_HEADERS.length).map((value) => String(value ?? '').trim());
if (headers.length !== EXPECTED_HEADERS.length || headers.some((value, i) => value !== EXPECTED_HEADERS[i])) {
  throw new Error('BaseDatos header does not match the canonical 37-column schema');
}

const normalizeCell = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
};

const validRows = [];
const blankIdRows = [];
const ids = new Set();
for (let i = 1; i < matrix.length; i += 1) {
  const sourceRow = i + 1;
  const values = matrix[i].slice(0, EXPECTED_HEADERS.length).map(normalizeCell);
  while (values.length < EXPECTED_HEADERS.length) values.push(null);
  const hasAny = values.some((value) => value !== null && String(value).trim() !== '');
  if (!hasAny) continue;

  const id = String(values[0] ?? '').trim();
  if (!id) {
    blankIdRows.push(sourceRow);
    continue;
  }
  if (ids.has(id)) throw new Error(`Duplicate drilling ID ${id} at source row ${sourceRow}`);
  ids.add(id);
  validRows.push([sourceRow, ...values]);
}

if (validRows.length !== EXPECTED_VALID_ROWS) {
  throw new Error(`Canonical valid-row count mismatch. Expected ${EXPECTED_VALID_ROWS}, got ${validRows.length}`);
}
if (blankIdRows.length !== 1 || blankIdRows[0] !== EXPECTED_BLANK_ID_SOURCE_ROW) {
  throw new Error(`Unexpected blank-ID rows. Expected only ${EXPECTED_BLANK_ID_SOURCE_ROW}, got ${blankIdRows.join(',') || 'none'}`);
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const batchSize = 250;
let accepted = 0;
for (let i = 0; i < validRows.length; i += batchSize) {
  const rows = validRows.slice(i, i + batchSize);
  const { data, error } = await supabase.rpc('import_motil_drilling_compact_v1', { p_rows: rows });
  if (error) throw new Error(`Import failed at offset ${i}: ${error.message}`);
  const reported = Number(data ?? 0);
  if (reported !== rows.length) throw new Error(`RPC count mismatch at offset ${i}: expected ${rows.length}, got ${reported}`);
  accepted += reported;
  console.log(`Imported ${accepted}/${EXPECTED_VALID_ROWS}`);
}

const { count, error: countError } = await supabase
  .from('production_drilling_source_reports')
  .select('*', { count: 'exact', head: true })
  .eq('source_file_sha256', EXPECTED_SHA256);
if (countError) throw new Error(`Verification failed: ${countError.message}`);
if (count !== EXPECTED_VALID_ROWS) throw new Error(`Final DB count mismatch. Expected ${EXPECTED_VALID_ROWS}, got ${count}`);

console.log(JSON.stringify({
  ok: true,
  source: workbookPath,
  sha256,
  importedOrUpdated: accepted,
  canonicalRows: count,
  blankIdExceptionSourceRow: EXPECTED_BLANK_ID_SOURCE_ROW,
}, null, 2));
