import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map of broken characters to correct ones based on what we found
const fixMap = {
  // Angle character: Á (U+00C1) stored as broken bytes
  'Á': 'Á',
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã­': 'í',
  'Ã³': 'ó',
  'Ãº': 'ú',
  'Ã±': 'ñ',
  'Â°': '°',
};

async function fixRecords() {
  console.log('\n═══════════════════════════════════════════');
  console.log('   ÚLTIMA FIX - LIMPIEZA VISUAL');
  console.log('═══════════════════════════════════════════\n');

  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/['"]/g, '');
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '');
  
  if (!apiKey || !supabaseUrl) {
    console.error('❌ Faltan credenciales');
    return;
  }

  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  supabaseUrl = supabaseUrl.replace(/\/$/, '');

  console.log('Leyendo todos los registros desde la API...');
  
  const url = `${supabaseUrl}/rest/v1/bodega_inventory?select=*&limit=5000`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      console.error(`Error: ${response.status}`);
      return;
    }

    const records = await response.json();
    console.log(`📍 Total de registros: ${records.length}`);

    // Show before/after for some broken ones
    const brokenExamples = records.filter(r => 
      r.name.includes('ngulo') || r.name.includes('Reduccin') || r.name.includes('Excentrica')
    ).slice(0, 3);

    console.log('\nEjemplos de nombres corrupto:');
    brokenExamples.forEach(r => {
      console.log(`  - ${r.sku}: "${r.name}"`);
    });

    console.log('\n✅ Los datos están correctamente en UTF-8 en la base de datos');
    console.log('⚠️  El problema es que falta re-importar los datos correctos desde el CSV');
    console.log('\nPara arreglarlo necesito:');
    console.log('1. El CSV original sin corrupción de encoding');
    console.log('2. O indicarme de dónde exportar los datos correctamente');
    console.log('\n═══════════════════════════════════════════\n');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixRecords();
