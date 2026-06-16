import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from .env file in project root
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log('No .env.local found, using process env vars');
    return process.env;
  }
  
  const env = {};
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key] = value;
    }
  });
  return { ...process.env, ...env };
}

const env = loadEnv();

// Parse CSV simple approach
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
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

// Import Cost Centers
async function importCostCenters() {
  console.log('\n📥 IMPORTANDO CENTROS DE COSTOS...');
  
  const csvPath = path.join(__dirname, 'import-centros-costos.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const { data } = parseCSV(content);
  
  console.log(`   Total de registros: ${data.length}`);
  
  // Build parent map
  const parentMap = {};
  data.forEach((record, idx) => {
    const codigo = record['CÓDIGO REC ELEC']?.trim() || '';
    const nombre = record['NOMBRE']?.trim() || '';
    const rutaCompleta = record['RUTA COMPLETA']?.trim() || '';
    const rutaParts = rutaCompleta.split('\\').map(p => p.trim()).filter(p => p);
    
    if (rutaParts.length > 1) {
      const parentNombre = rutaParts[rutaParts.length - 2];
      const parentRecord = data.find(r => r['NOMBRE']?.trim() === parentNombre);
      if (parentRecord) {
        parentMap[codigo] = parentRecord['CÓDIGO REC ELEC']?.trim();
      }
    }
  });

  // Format for insert
  const recordsToInsert = data
    .filter(r => r['CÓDIGO REC ELEC']?.trim() && r['NOMBRE']?.trim())
    .map(record => {
      const codigo = record['CÓDIGO REC ELEC']?.trim() || '';
      const nombre = record['NOMBRE']?.trim() || '';
      const rutaCompleta = record['RUTA COMPLETA']?.trim() || '';
      const rutaParts = rutaCompleta.split('\\').filter(p => p.trim());
      
      return {
        codigo_rec_elec: codigo,
        nombre: nombre,
        ruta_completa: rutaCompleta,
        parent_codigo: parentMap[codigo] || null,
        creador_por: record['CREADOR POR']?.trim() || 'Admin',
        notas: record['NOTAS']?.trim() || '',
        nivel: rutaParts.length,
        discontinuado: record['DISCONTINUADO']?.trim() === 'Sí' || false
      };
    });

  console.log(`   Registros a insertar: ${recordsToInsert.length}`);
  console.log(`   Primeros 3 registros de ejemplo:`);
  recordsToInsert.slice(0, 3).forEach((r, i) => {
    console.log(`     ${i+1}. ${r.codigo_rec_elec} - ${r.nombre} (padre: ${r.parent_codigo})`);
  });
  
  return recordsToInsert.length;
}

// Import Inventory
async function importInventory() {
  console.log('\n📥 IMPORTANDO INVENTARIO BODEGA...');
  
  const csvPath = path.join(__dirname, 'import-bodega.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const { data } = parseCSV(content);
  
  console.log(`   Total de registros: ${data.length}`);

  const recordsToInsert = data
    .filter(r => r['CÓDIGO']?.trim() && r['PRODUCTO']?.trim())
    .map(record => {
      const codigo = record['CÓDIGO']?.trim() || '';
      return {
        codigo: codigo,
        familia: record['FAMILIA']?.trim() || '',
        sub_familia: record['SUB-FAMILIA']?.trim() || '',
        equipo: record['EQUIPO']?.trim() || '',
        producto: record['PRODUCTO']?.trim() || '',
        cantidad: 0,
        estado: 'activo'
      };
    });

  console.log(`   Registros a insertar: ${recordsToInsert.length}`);
  console.log(`   Primeros 5 artículos de ejemplo:`);
  recordsToInsert.slice(0, 5).forEach((r, i) => {
    console.log(`     ${i+1}. ${r.codigo} - ${r.producto.substring(0, 40)}`);
  });
  
  return recordsToInsert.length;
}

// Main
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   PRE-VALIDACIÓN DE DATOS CSV');
  console.log('═══════════════════════════════════════════');

  try {
    const ccCount = await importCostCenters();
    const invCount = await importInventory();

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ VALIDACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════');
    console.log(`📍 Centros de Costos listos: ${ccCount}`);
    console.log(`📦 Artículos Bodega listos: ${invCount}`);
    console.log('═══════════════════════════════════════════\n');
    console.log('Para completar la importación a Supabase:');
    console.log('  1. Asegúrate de que las variables de entorno estén configuradas');
    console.log('  2. Las tablas cost_centers y bodega_inventory deben existir');
    console.log('  3. Usa el API endpoint POST /api/bodega/import-data\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
