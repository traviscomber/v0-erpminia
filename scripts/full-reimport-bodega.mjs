import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/['"]/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function cleanAccents(text) {
  if (!text) return '';
  return text.trim();
}

async function reimportBodega() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   RE-IMPORTACIÓN COMPLETA DE BODEGA (5,104 ITEMS)');
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
      const sku = cleanAccents(values[0]);
      const familia = cleanAccents(values[1]);
      const subfamilia = cleanAccents(values[2]);
      const equipo = cleanAccents(values[3]);
      const producto = cleanAccents(values[4]);
      
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
  
  console.log(`✅ ${records.length} registros válidos parsedos\n`);
  
  // Show samples
  console.log('📋 Primeros 3 registros:');
  records.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.sku} | ${r.name}`);
  });
  console.log();
  
  // Delete all existing records
  console.log('🗑️  Eliminando todos los registros existentes...');
  try {
    const { count: delCount } = await supabase
      .from('bodega_inventory')
      .delete()
      .gt('id', 0);
    console.log(`✓ Eliminados: ${delCount} registros`);
  } catch (err) {
    console.log(`⚠️  ${err.message}`);
  }
  
  // Insert all records
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;
  
  console.log(`\n📤 Insertando ${records.length} registros en batches de ${batchSize}...`);
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    try {
      const { error: insertError, data } = await supabase
        .from('bodega_inventory')
        .insert(batch)
        .select();
      
      if (insertError) {
        console.log(`   ❌ Batch ${batchNum}: ${insertError.message}`);
        errors += batch.length;
      } else {
        inserted += batch.length;
        const percent = Math.round((inserted / records.length) * 100);
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} insertados (${percent}%)`);
      }
    } catch (err) {
      console.log(`   ❌ Batch ${batchNum}: ${err.message}`);
      errors += batch.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`✅ RE-IMPORTACIÓN COMPLETADA`);
  console.log(`   Total a insertar: ${records.length}`);
  console.log(`   Insertados: ${inserted}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  console.log(`═══════════════════════════════════════════════════════\n`);
}

reimportBodega();
