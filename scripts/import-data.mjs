import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan variables de entorno SUPABASE');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para parsear CSV con encoding correcto
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
  
  return data;
}

// Importar Centros de Costos
async function importCostCenters() {
  console.log('📥 Importando Centros de Costos...');
  
  const csvPath = path.join(process.cwd(), 'scripts', 'import-centros-costos.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(content);
  
  console.log(`   Total de registros: ${records.length}`);
  
  let imported = 0;
  let errors = 0;

  // Primero insertar todos los registros sin parent_id
  for (const record of records) {
    try {
      const codigo = record['CÓDIGO REC ELEC']?.trim() || '';
      const nombre = record['NOMBRE']?.trim() || '';
      const rutaCompleta = record['RUTA COMPLETA']?.trim() || '';
      const creador = record['CREADOR POR']?.trim() || 'Admin';
      const notas = record['NOTAS']?.trim() || '';

      if (!codigo || !nombre) {
        console.log(`   ⚠️  Omitido: falta código o nombre`);
        continue;
      }

      // Calcular parent_id basado en ruta
      let parentId = null;
      const rutaParts = rutaCompleta.split('\\').map(p => p.trim()).filter(p => p);
      
      if (rutaParts.length > 1) {
        // Buscar el registro padre (nivel anterior)
        const parentNombre = rutaParts[rutaParts.length - 2];
        const parentRecord = records.find(r => r['NOMBRE']?.trim() === parentNombre);
        if (parentRecord) {
          parentId = parentRecord['CÓDIGO REC ELEC']?.trim();
        }
      }

      const { data, error } = await supabase
        .from('cost_centers')
        .upsert({
          codigo_rec_elec: codigo,
          nombre: nombre,
          ruta_completa: rutaCompleta,
          parent_codigo: parentId,
          creador_por: creador,
          notas: notas,
          nivel: rutaParts.length,
          discontinuado: false
        }, {
          onConflict: 'codigo_rec_elec'
        });

      if (error) {
        console.log(`   ❌ Error en ${nombre}: ${error.message}`);
        errors++;
      } else {
        imported++;
        if (imported % 50 === 0) {
          console.log(`   ✓ ${imported} registros importados...`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Error:`, err.message);
      errors++;
    }
  }

  console.log(`\n✅ Centros de Costos importados: ${imported}`);
  if (errors > 0) console.log(`⚠️  Errores: ${errors}`);
  
  return imported;
}

// Importar Inventario Bodega
async function importInventory() {
  console.log('\n📥 Importando Inventario Bodega...');
  
  const csvPath = path.join(process.cwd(), 'scripts', 'import-bodega.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(content);
  
  console.log(`   Total de registros: ${records.length}`);
  
  let imported = 0;
  let errors = 0;

  for (const record of records) {
    try {
      const codigo = record['CÓDIGO']?.trim() || '';
      const familia = record['FAMILIA']?.trim() || '';
      const subfamilia = record['SUB-FAMILIA']?.trim() || '';
      const equipo = record['EQUIPO']?.trim() || '';
      const producto = record['PRODUCTO']?.trim() || '';

      if (!codigo || !producto) {
        continue;
      }

      const { data, error } = await supabase
        .from('bodega_inventory')
        .upsert({
          codigo: codigo,
          familia: familia,
          sub_familia: subfamilia,
          equipo: equipo,
          producto: producto,
          cantidad: 0,
          estado: 'activo',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'codigo'
        });

      if (error) {
        console.log(`   ❌ Error en ${codigo}: ${error.message}`);
        errors++;
      } else {
        imported++;
        if (imported % 500 === 0) {
          console.log(`   ✓ ${imported} artículos importados...`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Error:`, err.message);
      errors++;
    }
  }

  console.log(`\n✅ Artículos de Bodega importados: ${imported}`);
  if (errors > 0) console.log(`⚠️  Errores: ${errors}`);
  
  return imported;
}

// Ejecutar importaciones
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   IMPORTACIÓN MASIVA A SUPABASE');
  console.log('═══════════════════════════════════════════\n');

  try {
    const costCentersCount = await importCostCenters();
    const inventoryCount = await importInventory();

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ IMPORTACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════');
    console.log(`📍 Centros de Costos: ${costCentersCount}`);
    console.log(`📦 Artículos Bodega: ${inventoryCount}`);
    console.log('═══════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
