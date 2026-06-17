import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const R = '\uFFFD'; // U+FFFD replacement char

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(';');
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const record = {};
    for (let j = 0; j < header.length; j++) {
      record[header[j]] = values[j] || '';
    }
    records.push(record);
  }
  
  return records;
}

// Spanish word map: corrupt -> correct
const spanishWordMap = {
  'C\ufffdigo': 'Código',
  'codigo': 'Código',
  'C\ufffdDIGO': 'CÓDIGO',
  'ruta': 'Ruta',
  'completa': 'Completa',
  'Ot\ufffdorla': 'Otárola',
  'Ot\ufffdrola': 'Otárola',
  'Mina': 'Mina',
  'M\ufffdquina': 'Máquina',
  'maquina': 'Máquina',
  'Creaci\ufffd': 'Creación',
  'creacion': 'Creación',
  'Modificaci\ufffd': 'Modificación',
  'modificacion': 'Modificación',
};

function fixText(s) {
  if (!s) return s;
  let result = s;
  
  // Dictionary replacements
  for (const [corrupt, correct] of Object.entries(spanishWordMap)) {
    const regex = new RegExp(corrupt, 'gi');
    result = result.replace(regex, correct);
  }
  
  // Remaining U+FFFD to ? for manual review
  return result;
}

function parseDate(dateStr) {
  // Parse DD-MM-YYYY HH:MM format from CSV
  // Return ISO string or null if invalid
  if (!dateStr || dateStr.trim() === '' || dateStr === '---') return null;
  
  const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  
  const [, day, month, year, hours, minutes] = match.map(m => parseInt(m || 0, 10));
  
  // Validate date ranges
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) {
    return null;
  }
  
  const date = new Date(year, month - 1, day, hours, minutes, 0);
  // Verify the date is valid
  if (isNaN(date.getTime())) return null;
  
  return date.toISOString();
}

async function run() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/['"]/g, '');
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, '');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Get organization
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('id').limit(1);
    if (orgError || !orgs?.length) {
      console.error('❌ No se encontró organización');
      process.exit(1);
    }
    const organization_id = orgs[0].id;
    console.log(`📦 Usando organización: ${organization_id}\n`);
    
    // Wait for schema cache to refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a fresh client to ensure schema cache is loaded
    const supabase2 = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    
    // Read and parse CSV
    const content = fs.readFileSync('scripts/centros-fixed.csv', 'utf-8');
    // Remove BOM if present
    const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
    
    const records = parseCSV(cleanContent);

    console.log(`\n📥 Importando ${records.length} centros de costos...\n`);

    // Reconstruct and prepare records
    const reconstructed = records
      .map((r) => {
        // Headers are corrupted, find them by position
        // Expected order: CREADOR POR, C?DIGO REC ELEC, DISCONTINUADO, FECHA CREACIÓN, FECHA MODIFICACIÓN, MODIFICADO POR, NOMBRE, NOTAS, RUTA COMPLETA
        const headers = Object.keys(r);
        const createdAt = parseDate(r[headers[3]]) || new Date().toISOString();
        const updatedAt = parseDate(r[headers[4]]) || new Date().toISOString();
        
        // If code (col 2) is empty, use name (col 7) as code
        let code = fixText(r[headers[1]] || '').trim();
        const name = fixText(r[headers[6]] || '').trim();
        if (!code && name) {
          code = name;
        }
        
        return {
          organization_id,
          code, // Use name as code if original code is empty
          name,
          description: fixText(r[headers[7]] || ''), // NOTAS (col 8)
          status: (r[headers[2]] || 'No').toLowerCase() === 'si' ? 'inactive' : 'active',
          created_at: createdAt,
          updated_at: updatedAt,
        };
      })
      .filter(r => r.name && r.code); // Only include records with both name and code

    // Delete existing via REST API directly
    const deleteRes = await fetch(`${supabaseUrl}/rest/v1/cost_centers?id=gt.-1`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });
    if (!deleteRes.ok) console.warn('⚠️  Advertencia al limpiar:', await deleteRes.text());

    // Insert in batches via REST API
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < reconstructed.length; i += batchSize) {
      const batch = reconstructed.slice(i, i + batchSize);
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/cost_centers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(batch),
      });
      
      if (!insertRes.ok) {
        const error = await insertRes.text();
        console.error(`❌ Error en batch ${i}-${i + batch.length}:`, error);
      } else {
        inserted += batch.length;
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} filas insertadas`);
      }
    }

    console.log(`\n✨ Total importado: ${inserted} centros de costos`);

    // Verify
    const { data: sample } = await supabase2
      .from('cost_centers')
      .select('code, name')
      .limit(5);
    console.log('\n📊 Muestra de datos (primeras 5):');
    sample?.forEach((r) => console.log(`  ${r.code} | ${r.name}`));

    // Check for corruption
    const { count: corrupted } = await supabase2
      .from('cost_centers')
      .select('*', { count: 'exact', head: true })
      .or(`name.ilike.%${R}%,full_path.ilike.%${R}%`);
    console.log(`\n⚠️  Filas con caracteres corruptos restantes: ${corrupted || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
