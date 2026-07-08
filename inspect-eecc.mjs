import { read, utils } from 'xlsx';
import fs from 'fs';

const data = fs.readFileSync('data/LISTADO-EECC-2f5c74.xlsx');
const workbook = read(data);

console.log('Sheet names:', workbook.SheetNames);
workbook.SheetNames.forEach(sheet => {
  console.log(`\n=== ${sheet} ===`);
  const json = utils.sheet_to_json(workbook.Sheets[sheet]).slice(0, 5);
  console.log(JSON.stringify(json, null, 2));
  console.log(`Total rows: ${utils.sheet_to_json(workbook.Sheets[sheet]).length}`);
});
