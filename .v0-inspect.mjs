import { read, utils } from 'xlsx';
import { readFileSync } from 'fs';

const files = [
  'data/Costos-equipos-Mayo-2026-1-187d08.xlsx',
  'data/Base-Existencias-1-a6346f.xlsx',
  'data/Existencias-2-9efed1.xlsx',
  'data/Anlisis-de-bodega-1-793539.xlsx',
];

for (const f of files) {
  console.log('\n═══════════════════════════════════════════');
  console.log('FILE:', f);
  console.log('═══════════════════════════════════════════');
  const buf = readFileSync(f);
  const wb = read(buf, { cellDates: true });
  console.log('Sheets:', wb.SheetNames);
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const json = utils.sheet_to_json(ws, { defval: null });
    console.log(`\n--- Sheet "${name}" | rows: ${json.length} ---`);
    if (json.length > 0) {
      console.log('Columns:', JSON.stringify(Object.keys(json[0])));
      console.log('Sample row:', JSON.stringify(json[0]).slice(0, 800));
    }
  }
}
