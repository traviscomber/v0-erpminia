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

// Character encoding mapping - common Windows-1252 to UTF-8 issues
const charMap = {
  'Á': 'Á',
  'á': 'á',
  'É': 'É',
  'é': 'é',
  'Í': 'Í',
  'í': 'í',
  'Ó': 'Ó',
  'ó': 'ó',
  'Ú': 'Ú',
  'ú': 'ú',
  'Ñ': 'Ñ',
  'ñ': 'ñ',
  'Ü': 'Ü',
  'ü': 'ü',
  '°': '°',
  '–': '-',
};

function cleanText(text) {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Replace known broken characters
  Object.entries(charMap).forEach(([broken, correct]) => {
    // Try various ways the character might appear
    cleaned = cleaned.replaceAll(broken, correct);
  });
  
  // Remove other control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
  
  return cleaned;
}

function parseCSV(filePath) {
  try {
    // Read file with different encoding attempts
    let buffer = fs.readFileSync(filePath);
    let content = '';
    
    // Try UTF-8 first
    try {
      content = buffer.toString('utf-8');
      // Remove BOM if present
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
    } catch (err) {
      // Try latin1/iso-8859-1
      try {
        content = buffer.toString('latin1');
      } catch (err2) {
        // Fallback to binary
        content = buffer.toString('binary');
      }
    }
    
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }
    
    const headers = lines[0].split(';').map(h => h.trim());
    const data = lines.slice(1).map(line => {
      const values = line.split(';').map(v => v.trim());
      const obj = {};
      headers.forEach((key, i) => {
        obj[key] = cleanText(values[i] || '');
      });
      return obj;
    });
    
    return { headers, data };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return { headers: [], data: [] };
  }
}

async function importBodegaData() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   IMPORTACIÓN DE BODEGA CON ENCODING CORRECTO');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const bodegaPath = path.join(__dirname, 'bodega-fixed.csv');
  const buffer = fs.readFileSync(bodegaPath);
  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  console.log(`📍 Registros leídos: ${lines.length - 1}`);
  
  const records = lines
    .slice(1)
    .map((line, idx) => {
      const values = line.split(';').map(v => cleanText(v));
      
      // Column indices based on header: CÓDIGO;FAMILIA;SUB-FAMILIA;EQUIPO;PRODUCTO
      const sku = values[0];
      const familia = values[1];
      const subfamilia = values[2];
      const equipo = values[3];
      const producto = values[4];
      
      if (!sku || !producto) return null;
      
      const record = {
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
      
      if (idx < 3) {
        console.log(`  ${idx + 1}. ${record.sku} | "${record.name}"`);
      }
      
      return record;
    })
    .filter(Boolean);
  
  console.log(`\n📊 Total de artículos a importar: ${records.length}`);
  
  // Delete existing records
  console.log('\n🗑️  Limpiando tabla bodega_inventory...');
  try {
    await supabase.from('bodega_inventory').delete().gt('id', 0);
    console.log('   ✓ Tabla limpiada');
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }
  
  // Import in batches
  const batchSize = 250;
  let imported = 0;
  let errors = 0;
  
  console.log(`\n📤 Importando en batches de ${batchSize}...`);
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    try {
      const { error } = await supabase
        .from('bodega_inventory')
        .insert(batch);
      
      if (error) {
        console.log(`   ❌ Batch ${batchNum}: ${error.message}`);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} items`);
      }
    } catch (err) {
      console.log(`   ❌ Batch ${batchNum}: ${err.message}`);
      errors += batch.length;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`✅ IMPORTACIÓN BODEGA COMPLETADA`);
  console.log(`   Total: ${records.length}`);
  console.log(`   Importados: ${imported}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  console.log(`═══════════════════════════════════════════════════════\n`);
}

async function importCostCentersData() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   IMPORTACIÓN DE CENTROS DE COSTOS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const centrosPath = path.join(__dirname, 'centros-fixed.csv');
  const buffer = fs.readFileSync(centrosPath);
  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  console.log(`📍 Registros leídos: ${lines.length - 1}`);
  
  const records = lines
    .slice(1)
    .map((line, idx) => {
      const values = line.split(';').map(v => cleanText(v));
      
      // Column indices: CREADOR POR;CÓDIGO REC ELEC;DISCONTINUADO;FECHA CREACION;FECHA MODIFICACION;MODIFICADO POR;NOMBRE;NOTAS;RUTA COMPLETA
      const creador = values[0];
      const codigo = values[1];
      const discontinuado = values[2];
      const nombre = values[6];
      const notas = values[7];
      const rutaCompleta = values[8];
      
      if (!codigo || !nombre) return null;
      
      const record = {
        codigo_rec_elec: codigo,
        nombre: nombre,
        ruta_completa: rutaCompleta,
        parent_codigo: '',
        nivel: 0,
        creador_por: creador,
        notas: notas,
        discontinuado: discontinuado === 'No' ? false : true
      };
      
      if (idx < 3) {
        console.log(`  ${idx + 1}. ${record.codigo_rec_elec} | "${record.nombre}"`);
      }
      
      return record;
    })
    .filter(Boolean);
  
  console.log(`\n📊 Total de centros a importar: ${records.length}`);
  
  // Delete existing records
  console.log('\n🗑️  Limpiando tabla cost_centers...');
  try {
    await supabase.from('cost_centers').delete().gt('id', 0);
    console.log('   ✓ Tabla limpiada');
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }
  
  // Import in batches
  const batchSize = 250;
  let imported = 0;
  let errors = 0;
  
  console.log(`\n📤 Importando en batches de ${batchSize}...`);
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    
    try {
      const { error } = await supabase
        .from('cost_centers')
        .insert(batch);
      
      if (error) {
        console.log(`   ❌ Batch ${batchNum}: ${error.message}`);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`   ✓ Batch ${batchNum}: ${batch.length} items`);
      }
    } catch (err) {
      console.log(`   ❌ Batch ${batchNum}: ${err.message}`);
      errors += batch.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`✅ IMPORTACIÓN CENTROS COMPLETADA`);
  console.log(`   Total: ${records.length}`);
  console.log(`   Importados: ${imported}`);
  if (errors > 0) console.log(`   Errores: ${errors}`);
  console.log(`═══════════════════════════════════════════════════════\n`);
}

async function main() {
  try {
    await importBodegaData();
    await importCostCentersData();
    
    console.log('✅ TODAS LAS IMPORTACIONES COMPLETADAS EXITOSAMENTE\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
