import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/['"]/g, '');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanAndReimport() {
  console.log('\n═══════════════════════════════════════════');
  console.log('   LIMPIEZA Y RE-IMPORTACIÓN COMPLETA');
  console.log('═══════════════════════════════════════════\n');

  // 1. Delete all existing records
  console.log('🗑️  Limpiando tabla bodega_inventory...');
  try {
    const { error } = await supabase
      .from('bodega_inventory')
      .delete()
      .gt('id', 0);  // Delete all records
    
    if (error) console.log(`   Warning: ${error.message}`);
    else console.log('   ✓ Tabla limpiada');
  } catch (err) {
    console.log(`   Warning: ${err.message}`);
  }

  // 2. Convert CSV file properly
  console.log('\n📄 Convirtiendo archivo CSV...');
  const csvPath = path.join(__dirname, 'import-bodega.csv');
  
  // First try: read as binary and detect encoding
  const buffer = fs.readFileSync(csvPath);
  
  // Try different encodings
  let content = '';
  try {
    // Try UTF-8 with BOM removal
    content = buffer.toString('utf-8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
  } catch (err) {
    try {
      content = buffer.toString('latin1');
    } catch (err2) {
      content = buffer.toString('ascii');
    }
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    console.error('❌ CSV no válido');
    return;
  }

  const header = lines[0].split(';').map(h => h.trim());
  console.log(`   ✓ Header: ${header.join(' | ')}`);

  // 3. Parse records with proper encoding handling
  const records = lines.slice(1)
    .map((line, idx) => {
      const values = line.split(';').map(v => v.trim());
      return {
        sku: values[0] || '',
        familia: values[1] || '',
        subfamilia: values[2] || '',
        equipo: values[3] || '',
        producto: values[4] || ''
      };
    })
    .filter(r => r.sku && r.producto)
    .map(r => ({
      sku: r.sku,
      name: r.producto,
      category: r.familia,
      description: `${r.subfamilia}${r.equipo ? ' - ' + r.equipo : ''}`.trim() || r.producto,
      quantity: 0,
      unit_cost: 0,
      min_stock: 0,
      max_stock: 0,
      location: ''
    }));

  console.log(`   ✓ ${records.length} registros parsedos`);

  // 4. Show samples
  console.log('\n📋 Primeros 5 registros a importar:');
  records.slice(0, 5).forEach((r, i) => {
    console.log(`   ${i+1}. ${r.sku} | ${r.name.substring(0, 40)}`);
  });

  // 5. Import via API
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/['"]/g, '');
  if (!apiKey) {
    console.error('❌ Faltan credenciales ANON_KEY');
    return;
  }

  const url = `${supabaseUrl}/rest/v1/bodega_inventory`;
  console.log(`\n📤 Importando a ${url}...`);

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
        console.log(`   ❌ Batch ${batchNum}: HTTP ${response.status}`);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} items`);
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

cleanAndReimport();
