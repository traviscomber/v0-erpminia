import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TextDecoder } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV  with proper encoding handling
function parseCSV(filePath) {
  let buffer = fs.readFileSync(filePath);
  
  // Remove BOM if present
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    buffer = buffer.slice(3);
  }
  
  const content = buffer.toString('utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) return { header: [], data: [] };
  
  const header = lines[0].split(';').map(h => h.trim());
  console.log(`Header fields: ${header.map((h, i) => `[${i}]=${h}`).join(', ')}`);
  
  const data = lines.slice(1).map(line => {
    const values = line.split(';');
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = values[idx]?.trim() || '';
    });
    return obj;
  });
  
  return { header, data };
}

async function importInventory() {
  console.log('\n═══════════════════════════════════════════');
  console.log('   IMPORTANDO INVENTARIO BODEGA V2');
  console.log('═══════════════════════════════════════════\n');
  
  const csvPath = path.join(__dirname, 'import-bodega.csv');
  const { header, data } = parseCSV(csvPath);
  
  console.log(`📍 Columnas: ${header.join(', ')}`);
  console.log(`📦 Total de registros: ${data.length}`);
  
  // Find column indices
  const codigoIdx = header.findIndex(h => h.includes('DIG') || h.includes('código'));
  const familiaIdx = header.findIndex(h => h.includes('FAMILIA'));
  const subfamiliaIdx = header.findIndex(h => h.includes('SUB'));
  const equipoIdx = header.findIndex(h => h.includes('EQUIPO'));
  const productoIdx = header.findIndex(h => h.includes('PRODUCTO'));
  
  console.log(`\n📌 Índices encontrados:`);
  console.log(`   CÓDIGO: ${codigoIdx}`);
  console.log(`   FAMILIA: ${familiaIdx}`);
  console.log(`   SUB-FAMILIA: ${subfamiliaIdx}`);
  console.log(`   EQUIPO: ${equipoIdx}`);
  console.log(`   PRODUCTO: ${productoIdx}\n`);
  
  const records = data
    .filter((r, idx) => {
      const codigo = Object.values(r)[codigoIdx]?.trim();
      const producto = Object.values(r)[productoIdx]?.trim();
      if (!codigo || !producto) return false;
      return true;
    })
    .map((r, idx) => {
      const values = Object.values(r);
      return {
        codigo: values[codigoIdx]?.trim() || '',
        familia: values[familiaIdx]?.trim() || '',
        sub_familia: values[subfamiliaIdx]?.trim() || '',
        equipo: values[equipoIdx]?.trim() || '',
        producto: values[productoIdx]?.trim() || '',
        cantidad: 0,
        estado: 'activo'
      };
    });

  console.log(`📥 Registros válidos: ${records.length}`);
  console.log(`\n🔍 Primeros 3 registros:`);
  records.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i+1}. ${r.codigo} - ${r.familia} - ${r.producto.substring(0, 50)}`);
  });
  
  // Upload in batches of 100
  const batchSize = 100;
  let imported = 0;
  let errors = 0;

  console.log(`\n📤 Subiendo ${records.length} items en batches de ${batchSize}...`);

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    try {
      const response = await fetch('http://localhost:3000/api/bodega/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'inventory',
          data: batch
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.log(`   ❌ Batch ${batchNum}: HTTP ${response.status}`);
        errors += batch.length;
      } else {
        const result = await response.json();
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} items`);
        imported += batch.length;
      }
    } catch (err) {
      console.log(`   ❌ Batch ${batchNum}: ${err.message}`);
      errors += batch.length;
    }
  }

  return { imported, errors, total: records.length };
}

async function main() {
  try {
    const result = await importInventory();
    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ RESULTADO FINAL:`);
    console.log(`   Total procesados: ${result.total}`);
    console.log(`   Importados: ${result.imported}`);
    if (result.errors > 0) console.log(`   Errores: ${result.errors}`);
    console.log('═══════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
