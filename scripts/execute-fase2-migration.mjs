import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/['"]/g, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, '');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = fs.readFileSync('db/migrations/fase2_add_cost_centers.sql', 'utf-8');

const statements = sql
  .split(';')
  .map(s =>
    s
      .split('\n')
      .map(line => {
        const commentIdx = line.indexOf('--');
        return commentIdx === -1 ? line : line.substring(0, commentIdx);
      })
      .join('\n')
      .trim(),
  )
  .filter(s => s.length > 0);

console.log(`📋 Found ${statements.length} SQL statements\n`);

(async () => {
  try {
    // Since Supabase doesn't support raw SQL execution via SDK,
    // we'll use the REST API for each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing...`);

      // For now, just log what would be executed
      // In production, execute via Supabase Dashboard or direct PostgreSQL
      if (stmt.includes('ALTER TABLE') || stmt.includes('CREATE INDEX')) {
        console.log(`  ✓ ${stmt.substring(0, 60)}...`);
      }
    }

    console.log('\n✅ Migration statements prepared.');
    console.log('⚠️  To execute: Copy statements to Supabase Dashboard SQL Editor and run.\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
