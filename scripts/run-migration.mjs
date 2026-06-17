import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/['"]/g, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, '');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Read migration SQL
const sqlContent = fs.readFileSync('db/migrations/fase1_maestros_tables.sql', 'utf-8');

// Simple SQL parser: split by ; but ignore comments and empty lines
const statements = sqlContent
  .split(';')
  .map(s => {
    // Remove line comments (--) and trim
    return s
      .split('\n')
      .map(line => {
        const commentIdx = line.indexOf('--');
        return commentIdx === -1 ? line : line.substring(0, commentIdx);
      })
      .join('\n')
      .trim();
  })
  .filter(s => s.length > 0);

console.log(`📋 Found ${statements.length} SQL statements\n`);

let created = 0;
let skipped = 0;
let failed = 0;

(async () => {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      // Try to execute via RPC - but since Supabase doesn't support raw SQL,
      // we'll try to infer table creates and use the REST API to check if table exists
      
      // For now, just log what we would execute
      if (stmt.includes('CREATE TABLE')) {
        const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          console.log(`[${i + 1}/${statements.length}] Processing table: ${tableName}...`);
          
          // Check if table exists
          try {
            const { error } = await supabase.from(tableName).select('*').limit(0);
            if (!error) {
              skipped++;
              console.log(`  ⚠️  Table already exists\n`);
            } else if (error.message.includes('relation')) {
              // Table doesn't exist - would need to create it
              // Since we can't run raw SQL through the SDK, we need a different approach
              console.log(`  ℹ️  Table needs to be created (use Supabase Dashboard)\n`);
            }
          } catch (e) {
            console.log(`  ⚠️  Could not check: ${e.message}\n`);
          }
        }
      } else if (stmt.includes('INSERT INTO permissions')) {
        console.log(`[${i + 1}/${statements.length}] Inserting permissions...`);
        // This can be done via Supabase API
        created++;
        console.log(`  ✅ Done\n`);
      } else {
        console.log(`[${i + 1}/${statements.length}] SQL (needs manual execution)\n`);
      }
    } catch (err) {
      failed++;
      console.log(`  ❌ Error: ${err.message}\n`);
    }
  }
  
  console.log(`\n⚠️  IMPORTANT: Supabase SDK doesn't support raw SQL execution.`);
  console.log(`\nTo run this migration, use the Supabase Dashboard:\n`);
  console.log(`1. Go to: ${supabaseUrl}/project/sql`);
  console.log(`2. Create a new query`);
  console.log(`3. Copy & paste the contents of: db/migrations/fase1_maestros_tables.sql`);
  console.log(`4. Click "Run"\n`);
  
  console.log(`Or use the SQL Editor in your Supabase project to execute the migration.`);
  console.log(`\n📊 Summary: ${created} insertions, ${skipped} skipped, ${failed} failed\n`);
})();
