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
  
  let cleaned = text.trim();
  
  // Fix common UTF-8 encoding issues
  // These are bytes that appear when Latin-1 is decoded as UTF-8
  const replacements = [
    // Common corrupted accents
    [/\u00C3\u00A1/g, 'á'],  // á encoded wrong
    [/\u00C3\u00A9/g, 'é'],  // é encoded wrong
    [/\u00C3\u00AD/g, 'í'],  // í encoded wrong
    [/\u00C3\u00B3/g, 'ó'],  // ó encoded wrong
    [/\u00C3\u00BA/g, 'ú'],  // ú encoded wrong
    [/\u00C3\u00B1/g, 'ñ'],  // ñ encoded wrong
    [/\u00C3\u00A9/g, 'é'],  // Duplicate for safety
    // Angle character symbol issues
    [/\u00C3\u00A1ngulo/gi, 'Ángulo'],
    [/[?]ngulo/gi, 'Ángulo'],
    [/\u00A1ngulo/gi, 'Ángulo'],
    // Other common words
    [/Reduc[c]?i[?o]n/g, 'Reducción'],
    [/Excéntrica/g, 'Excéntrica'],
    [/Ca[?n]er[í?]/g, 'Cañería'],
    [/Codo Galvanizado 90[°?]/g, 'Codo Galvanizado 90°'],
    [/Desag[?u]e/g, 'Desagüe'],
    [/Porf[?i]/g, 'Por fi'],
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    cleaned = cleaned.replace(pattern, replacement);
  });
  
  // Remove remaining broken characters
  cleaned = cleaned.replace(/[?]/g, '');
  
  return cleaned;
}

async function fixBodegaNames() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   LIMPIEZA DE NOMBRES EN BODEGA');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Get all records
  console.log('📍 Leyendo registros de bodega_inventory...');
  const { data: records, error: selectError } = await supabase
    .from('bodega_inventory')
    .select('id, sku, name, category, description')
    .order('sku');
  
  if (selectError) {
    console.error('Error:', selectError);
    return;
  }
  
  console.log(`✓ Se leyeron ${records.length} registros`);
  
  // Show before/after samples
  console.log('\n📋 Ejemplos de correcciones:');
  const samples = records.filter(r => r.name.includes('?') || r.name.includes('Á')).slice(0, 5);
  samples.forEach(r => {
    const cleaned = cleanAccents(r.name);
    console.log(`  "${r.name}"`);
    console.log(`  → "${cleaned}"\n`);
  });
  
  // Prepare updates
  const updates = records
    .map(r => ({
      id: r.id,
      sku: r.sku,
      name: cleanAccents(r.name),
      category: cleanAccents(r.category),
      description: cleanAccents(r.description),
      updated_at: new Date().toISOString()
    }))
    .filter(r => 
      r.name !== records.find(rec => rec.id === r.id).name ||
      r.category !== records.find(rec => rec.id === r.id).category
    );
  
  console.log(`\n✅ ${updates.length} registros necesitan corrección\n`);
  
  if (updates.length === 0) {
    console.log('No hay correcciones necesarias.');
    return;
  }
  
  // Update in batches
  const batchSize = 100;
  let updated = 0;
  let errors = 0;
  
  console.log(`📤 Actualizando en batches de ${batchSize}...`);
  
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    try {
      const { error: updateError } = await supabase
        .from('bodega_inventory')
        .upsert(batch);
      
      if (updateError) {
        console.log(`   ❌ Batch ${batchNum}: ${updateError.message}`);
        errors += batch.length;
      } else {
        updated += batch.length;
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} actualizados`);
      }
    } catch (err) {
      console.log(`   ❌ Batch ${batchNum}: ${err.message}`);
      errors += batch.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`✅ LIMPIEZA COMPLETADA`);
  console.log(`   Total a actualizar: ${updates.length}`);
  console.log(`   Actualizados: ${updated}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  console.log(`═══════════════════════════════════════════════════════\n`);
}

fixBodegaNames();
