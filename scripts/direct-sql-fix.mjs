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
  console.log('   FIX DIRECTO DE CARACTERES ROTOS');
  console.log('═══════════════════════════════════════════\n');

  // Get all records to inspect
  const { data: records, error } = await supabase
    .from('bodega_inventory')
    .select('id, sku, name, description')
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Primeros 10 items actuales:');
  records.slice(0, 10).forEach((r, i) => {
    console.log(`${i+1}. ${r.sku}: ${r.name}`);
    console.log(`   Hex: ${Buffer.from(r.name).toString('hex')}`);
  });

  console.log('\n🔍 Analizando caracteres problemáticos...');
  
  // Find broken characters pattern
  const brokenChars = new Set();
  records.forEach(r => {
    for (let char of r.name) {
      if (char.charCodeAt(0) > 127 && char.charCodeAt(0) < 256) {
        brokenChars.add(char);
      }
    }
  });

  console.log('Caracteres no-ASCII encontrados:');
  brokenChars.forEach(char => {
    console.log(`  - "${char}" (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`);
  });

  // Character mapping based on visual inspection
  const charReplacements = [
    { broken: '◆', correct: 'Á' }, // Diamond might be Á
    { broken: '●', correct: 'ó' },
    { broken: '¶', correct: 'ó' },
    { broken: '†', correct: 'ú' },
    { broken: 'Â', correct: '' }, // Remove broken Â
    { broken: 'Ã', correct: 'A' },
  ];

  console.log('\nActualizando registros...');
  let updated = 0;

  // Update in batches
  const allRecords = await supabase
    .from('bodega_inventory')
    .select('id, name, description, category');

  for (let record of allRecords.data || []) {
    let newName = record.name;
    let newDesc = record.description || '';
    
    // Replace problematic characters
    charReplacements.forEach(({ broken, correct }) => {
      newName = newName.replaceAll(broken, correct);
      newDesc = newDesc.replaceAll(broken, correct);
    });

    // Check if changed
    if (newName !== record.name || newDesc !== record.description) {
      const { error: updateError } = await supabase
        .from('bodega_inventory')
        .update({
          name: newName,
          description: newDesc,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id);

      if (!updateError) {
        updated++;
      }
    }
  }

  console.log(`✅ Actualizados: ${updated} registros`);
  console.log('\n═══════════════════════════════════════════\n');
}

fixData();
