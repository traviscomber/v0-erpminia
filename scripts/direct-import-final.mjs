import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV
function parseCSV(filePath) {
  let buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    buffer = buffer.slice(3);
  }
  
  const content = buffer.toString('utf-8');
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
  console.log('   IMPORTACIÓN DIRECTA FINAL A SUPABASE');
  console.log('═══════════════════════════════════════════\n');
  
  const csvPath = path.join(__dirname, 'import-bodega.csv');
  const { header, data } = parseCSV(csvPath);
  
  const codigoIdx = header.findIndex(h => h.includes('DIG'));
  const familiaIdx = header.findIndex(h => h.includes('FAMILIA'));
  const subfamiliaIdx = header.findIndex(h => h.includes('SUB'));
  const equipoIdx = header.findIndex(h => h.includes('EQUIPO'));
  const productoIdx = header.findIndex(h => h.includes('PRODUCTO'));
  
  const records = data
    .filter((r) => {
      const values = Object.values(r);
      return values[codigoIdx]?.trim() && values[productoIdx]?.trim();
    })
    .map((r) => {
      const values = Object.values(r);
      return {
        sku: values[codigoIdx]?.trim() || '',
        name: values[productoIdx]?.trim() || '',
        category: values[familiaIdx]?.trim() || '',
        description: `${values[subfamiliaIdx]?.trim() || ''}${values[equipoIdx] ? ' - ' + values[equipoIdx]?.trim() : ''}`.trim() || values[productoIdx]?.trim() || '',
        quantity: 0,
        unit_cost: 0,
        min_stock: 0,
        max_stock: 0,
        location: ''
      };
    });

  console.log(`📥 Total registros válidos: ${records.length}`);
  console.log(`\n🔍 Primeros 3 registros:`);
  records.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i+1}. ${r.sku} - ${r.name.substring(0, 50)}`);
  });

  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!apiKey || !supabaseUrl) {
    console.error('❌ Faltan credenciales');
    return;
  }

  // Ensure URL has protocol
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }

  // Remove trailing slash if present
  supabaseUrl = supabaseUrl.replace(/\/$/, '');

  const url = `${supabaseUrl}/rest/v1/bodega_inventory`;
  console.log(`\n📤 Enviando a: ${url}`);
  console.log(`📤 Enviando ${records.length} items...\n`);

  // Send in batches of 200 for stability
  const batchSize = 200;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(batch)
      });

      if (!response.ok) {
        const text = await response.text();
        console.log(`   ❌ Batch ${batchNum}: HTTP ${response.status}`);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} items importados`);
      }
    } catch (err) {
      console.log(`   ❌ Batch ${batchNum}: ${err.message}`);
      errors += batch.length;
    }
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`✅ IMPORTACIÓN COMPLETADA`);
  console.log(`   Total: ${records.length}`);
  console.log(`   Importados: ${imported}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  console.log(`═══════════════════════════════════════════\n`);
}

importInventory();
