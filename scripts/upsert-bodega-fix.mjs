import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/['"]/g, '');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE credentials');
  process.exit(1);
}

// Use service role for destructive operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanAndReimportBodega() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   CLEAN DELETE & RE-IMPORTACIÓN (5,104 ITEMS)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Read CSV
  const bodegaPath = path.join(__dirname, 'bodega-fixed.csv');
  const buffer = fs.readFileSync(bodegaPath);
  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  console.log(`📍 Total líneas en CSV: ${lines.length - 1}`);
  
  // Parse all records
  const records = lines
    .slice(1)
    .map(line => {
      const values = line.split(';').map(v => v.trim());
      const sku = values[0] || '';
      const familia = values[1] || '';
      const subfamilia = values[2] || '';
      const equipo = values[3] || '';
      const producto = values[4] || '';
      
      if (!sku || !producto) return null;
      
      return {
        sku,
        name: producto,
        category: familia,
        description: [subfamilia, equipo].filter(Boolean).join(' - ') || producto,
        quantity: 0,
        unit_cost: 0,
        min_stock: 0,
        max_stock: 0,
        location: ''
      };
    })
    .filter(Boolean);
  
  console.log(`✅ ${records.length} registros válidos\n`);
  console.log('📋 Primeros 3:');
  records.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.sku} | ${r.name}`);
  });
  
  // Delete with direct SQL via RPC
  console.log('\n🗑️  Limpiando tabla (método 1: Delete all)...');
  try {
    const { error: delError1 } = await supabase
      .from('bodega_inventory')
      .delete()
      .neq('id', 0);  // Delete all where id != 0 (i.e., all records)
    
    if (delError1) {
      console.log(`   Método 1 falló: ${delError1.message}`);
      
      // Try method 2: truncate via SQL
      console.log('   Intentando truncate...');
      // Can't do this without RPC, so we'll use upsert instead
    }  else {
      console.log('   ✓ Todos los registros eliminados');
    }
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }
  
  // Actually, let's just use upsert which will overwrite existing records
  console.log('\n📤 Usando UPSERT para insertar/actualizar todos los registros...');
  
  const batchSize = 500;
  let upserted = 0;
  let errors = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    try {
      const { error: upsertError } = await supabase
        .from('bodega_inventory')
        .upsert(batch, { onConflict: 'sku' });
      
      if (upsertError) {
        console.log(`   ❌ Batch ${batchNum}: ${upsertError.message}`);
        errors += batch.length;
      } else {
        upserted += batch.length;
        const percent = Math.round((upserted / records.length) * 100);
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} upserted (${percent}%)`);
      }
    } catch (err) {
      console.log(`   ❌ Batch ${batchNum}: ${err.message}`);
      errors += batch.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`✅ OPERACIÓN COMPLETADA`);
  console.log(`   Total de registros: ${records.length}`);
  console.log(`   Procesados: ${upserted}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  console.log(`═══════════════════════════════════════════════════════\n`);
}

cleanAndReimportBodega();
