import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSVWithProperEncoding(filePath) {
  // Read file with explicit UTF-8 encoding
  let buffer = fs.readFileSync(filePath, 'utf8');
  
  // Remove BOM if present
  if (buffer.charCodeAt(0) === 0xFEFF) {
    buffer = buffer.slice(1);
  }
  
  const lines = buffer.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) return { header: [], data: [] };
  
  const header = lines[0].split(';').map(h => h.trim());
  console.log(`Headers: ${header.join(' | ')}`);
  
  const data = lines.slice(1).map((line, idx) => {
    const values = line.split(';');
    const obj = {};
    header.forEach((key, i) => {
      obj[key] = values[i]?.trim() || '';
    });
    return obj;
  });
  
  return { header, data };
}

async function reimportInventory() {
  console.log('\n═══════════════════════════════════════════');
  console.log('   RE-IMPORTACIÓN CON ENCODING CORRECTO');
  console.log('═══════════════════════════════════════════\n');
  
  const csvPath = path.join(__dirname, 'import-bodega.csv');
  const { header, data } = parseCSVWithProperEncoding(csvPath);
  
  console.log(`Total registros leídos: ${data.length}`);
  console.log(`\nPrimeros 5 registros:`);
  
  const records = data
    .filter((r) => {
      const codigo = Object.values(r)[0]?.trim();
      const producto = Object.values(r)[4]?.trim();
      return codigo && producto;
    })
    .map((r) => {
      const values = Object.values(r);
      const sku = values[0]?.trim() || '';
      const familia = values[1]?.trim() || '';
      const subfamilia = values[2]?.trim() || '';
      const equipo = values[3]?.trim() || '';
      const producto = values[4]?.trim() || '';
      
      return {
        sku,
        name: producto,
        category: familia,
        description: `${subfamilia}${equipo ? ' - ' + equipo : ''}`.trim() || producto,
        quantity: 0,
        unit_cost: 0,
        min_stock: 0,
        max_stock: 0,
        location: ''
      };
    });

  records.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.sku} | ${r.name.substring(0, 40)}`);
  });

  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!apiKey || !supabaseUrl) {
    console.error('\n❌ Faltan credenciales SUPABASE');
    return;
  }

  // Ensure URL has protocol
  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  supabaseUrl = supabaseUrl.replace(/\/$/, '');

  const url = `${supabaseUrl}/rest/v1/bodega_inventory`;
  console.log(`\n📤 Enviando ${records.length} items a ${url}`);

  // First, delete all existing records
  console.log('\n🗑️  Limpiando registros existentes...');
  try {
    const deleteResponse = await fetch(`${url}`, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    console.log(`   Delete response: ${deleteResponse.status}`);
  } catch (err) {
    console.log(`   Warning: ${err.message}`);
  }

  // Import in batches of 200
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
  console.log(`✅ RE-IMPORTACIÓN COMPLETADA`);
  console.log(`   Total: ${records.length}`);
  console.log(`   Importados: ${imported}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  console.log(`═══════════════════════════════════════════\n`);
}

reimportInventory();
