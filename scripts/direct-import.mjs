import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function importInventoryDirect() {
  console.log('\n═══════════════════════════════════════════');
  console.log('   IMPORTACIÓN DIRECTA VÍA POST API V3');
  console.log('═══════════════════════════════════════════\n');
  
  const csvPath = path.join(__dirname, 'import-bodega.csv');
  const { header, data } = parseCSV(csvPath);
  
  // Find column indices
  const codigoIdx = header.findIndex(h => h.includes('DIG') || h.includes('código'));
  const familiaIdx = header.findIndex(h => h.includes('FAMILIA'));
  const subfamiliaIdx = header.findIndex(h => h.includes('SUB'));
  const equipoIdx = header.findIndex(h => h.includes('EQUIPO'));
  const productoIdx = header.findIndex(h => h.includes('PRODUCTO'));
  
  const records = data
    .filter((r, idx) => {
      const codigo = Object.values(r)[codigoIdx]?.trim();
      const producto = Object.values(r)[productoIdx]?.trim();
      if (!codigo || !producto) return false;
      return true;
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

  // Send all at once
  console.log(`\n📤 Enviando ${records.length} items...`);

  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!apiKey || !supabaseUrl) {
    console.error('❌ Faltan credenciales');
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/bodega_inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(records)
    });

    console.log(`   Response: HTTP ${response.status}`);
    
    const text = await response.text();
    if (!response.ok) {
      console.error(`   ❌ Error:`, text);
    } else {
      console.log(`   ✅ Importados exitosamente`);
      console.log(`\n═══════════════════════════════════════════`);
      console.log(`✅ COMPLETADO: ${records.length} items en Supabase`);
      console.log(`═══════════════════════════════════════════\n`);
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
}

importInventoryDirect();
