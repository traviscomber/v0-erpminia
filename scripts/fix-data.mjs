import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/['"]/g, '');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixData() {
  console.log('\n═══════════════════════════════════════════');
  console.log('   REPARANDO ENCODING EN BODEGA_INVENTORY');
  console.log('═══════════════════════════════════════════\n');

  // Get all records
  const { data: records, error: selectError } = await supabase
    .from('bodega_inventory')
    .select('*')
    .order('sku');

  if (selectError) {
    console.error('Error al leer datos:', selectError);
    return;
  }

  console.log(`📍 Total registros a procesar: ${records.length}`);

  // Define replacements for common encoding issues
  const replacements = [
    { find: /Ã¡/g, replace: 'á' },  // á
    { find: /Ã©/g, replace: 'é' },  // é
    { find: /Ã­/g, replace: 'í' },  // í
    { find: /Ã³/g, replace: 'ó' },  // ó
    { find: /Ãº/g, replace: 'ú' },  // ú
    { find: /Ã±/g, replace: 'ñ' },  // ñ
    { find: /Â°/g, replace: '°' },  // °
    { find: /Ã‰/g, replace: 'É' },  // É
    { find: /Â/g, replace: '' },    // Remove broken characters
    { find: /[?]/g, replace: '' },  // Remove question marks that shouldn't be there
  ];

  const fixedRecords = records.map(record => {
    let name = record.name || '';
    let description = record.description || '';
    let category = record.category || '';

    // Apply all replacements
    replacements.forEach(({ find, replace }) => {
      name = name.replace(find, replace);
      description = description.replace(find, replace);
      category = category.replace(find, replace);
    });

    return {
      id: record.id,
      sku: record.sku,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      quantity: record.quantity,
      unit_cost: record.unit_cost,
      min_stock: record.min_stock,
      max_stock: record.max_stock,
      location: record.location,
      created_at: record.created_at,
      updated_at: new Date().toISOString()
    };
  });

  // Show first 5 before/after
  console.log('\nPrimeros 5 registros (ANTES → DESPUÉS):');
  for (let i = 0; i < Math.min(5, records.length); i++) {
    console.log(`  ${i+1}. "${records[i].name}" → "${fixedRecords[i].name}"`);
  }

  // Update in batches of 100
  const batchSize = 100;
  let updated = 0;
  let errors = 0;

  console.log(`\n📤 Actualizando en batches de ${batchSize}...`);

  for (let i = 0; i < fixedRecords.length; i += batchSize) {
    const batch = fixedRecords.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

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
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`✅ REPARACIÓN COMPLETADA`);
  console.log(`   Total: ${records.length}`);
  console.log(`   Actualizados: ${updated}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  console.log(`═══════════════════════════════════════════\n`);
}

fixData();
