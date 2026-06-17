import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV simple
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { header: [], data: [] };
  
  const header = lines[0].split(';').map(h => h.trim());
  
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
  console.log('   IMPORTANDO INVENTARIO BODEGA');
  console.log('═══════════════════════════════════════════\n');
  
  const csvPath = path.join(__dirname, 'bodega-clean.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const { header, data } = parseCSV(content);
  
  console.log(`📍 Columnas detectadas: ${header.join(', ')}`);
  console.log(`📦 Total de registros: ${data.length}`);
  
  const records = data
    .filter(r => r['CÓDIGO']?.trim() && r['PRODUCTO']?.trim())
    .map(record => ({
      codigo: record['CÓDIGO']?.trim() || '',
      familia: record['FAMILIA']?.trim() || '',
      sub_familia: record['SUB-FAMILIA']?.trim() || '',
      equipo: record['EQUIPO']?.trim() || '',
      producto: record['PRODUCTO']?.trim() || '',
      cantidad: 0,
      estado: 'activo'
    }));

  console.log(`📥 Registros válidos: ${records.length}\n`);
  
  // Upload in batches of 100
  const batchSize = 100;
  let imported = 0;
  let errors = 0;

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
        try {
          const errorData = JSON.parse(text);
          console.log(`   ❌ Batch ${batchNum}: ${errorData.error}`);
        } catch {
          console.log(`   ❌ Batch ${batchNum}: ${response.status}`);
        }
        errors += batch.length;
      } else {
        const result = await response.json();
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} items - ${result.message}`);
        imported += batch.length;
      }
    } catch (err) {
      console.log(`   ❌ Batch ${batchNum} error: ${err.message}`);
      errors += batch.length;
    }
  }

  console.log(`\n✅ IMPORTACIÓN COMPLETADA`);
  console.log(`   Total procesados: ${records.length}`);
  console.log(`   Importados: ${imported}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  
  return { imported, errors, total: records.length };
}

async function main() {
  try {
    const result = await importInventory();
    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ RESULTADO FINAL:`);
    console.log(`   Total: ${result.total}`);
    console.log(`   Importados: ${result.imported}`);
    console.log(`   Errores: ${result.errors}`);
    console.log('═══════════════════════════════════════════\n');
  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
}

main();
