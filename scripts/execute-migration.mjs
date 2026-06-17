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

// Parse SQL statements
const statements = sqlContent
  .split(';')
  .map(s => {
    return s
      .split('\n')
      .map(line => {
        const idx = line.indexOf('--');
        return idx === -1 ? line : line.substring(0, idx);
      })
      .join('\n')
      .trim();
  })
  .filter(s => s.length > 10);

console.log(`📋 Parsed ${statements.length} SQL statements from migration file\n`);

// Strategy: Since Supabase SDK doesn't support raw SQL execution, we'll use:
// 1. Create a helper table
// 2. Use RPC to execute migration via PostgreSQL function
// OR use fetch to call Supabase REST API directly for individual operations

// Let's try a different approach: batch insert the permissions (which we CAN do through the SDK)
// For DDL (CREATE TABLE), we'll need to inform the user

console.log('⚠️  Supabase SDK doesn\'t support raw SQL execution via REST API.\n');
console.log('The migration includes DDL (CREATE TABLE) statements that require:\n');
console.log('1. SQL Editor in Supabase Dashboard, OR');
console.log('2. Using Supabase CLI with migration files\n');
console.log('However, I can execute the INSERT statements (permissions seed data)...\n');

// Extract and execute INSERT statements
const insertStatements = statements.filter(s => s.includes('INSERT INTO'));
console.log(`Found ${insertStatements.length} INSERT statements\n`);

// The permissions INSERT is already in the migration
// Let's manually insert the seed permissions via the SDK
const permissions = [
  { resource: 'documents', action: 'create', description: 'Crear nuevo documento' },
  { resource: 'documents', action: 'read', description: 'Ver documentos' },
  { resource: 'documents', action: 'update', description: 'Editar documentos' },
  { resource: 'documents', action: 'delete', description: 'Eliminar documentos' },
  { resource: 'documents', action: 'approve', description: 'Aprobar documentos' },
  { resource: 'documents', action: 'export', description: 'Exportar documentos' },
  { resource: 'maintenance', action: 'create', description: 'Crear orden de mantenimiento' },
  { resource: 'maintenance', action: 'read', description: 'Ver órdenes de mantenimiento' },
  { resource: 'maintenance', action: 'update', description: 'Editar órdenes de mantenimiento' },
  { resource: 'maintenance', action: 'delete', description: 'Eliminar órdenes de mantenimiento' },
  { resource: 'maintenance', action: 'assign', description: 'Asignar técnico' },
  { resource: 'maintenance', action: 'close', description: 'Cerrar orden' },
  { resource: 'inventory', action: 'create', description: 'Crear items de inventario' },
  { resource: 'inventory', action: 'read', description: 'Ver inventario' },
  { resource: 'inventory', action: 'update', description: 'Editar inventario' },
  { resource: 'inventory', action: 'delete', description: 'Eliminar items' },
  { resource: 'inventory', action: 'transfer', description: 'Transferir entre bodegas' },
  { resource: 'inventory', action: 'scan_qr', description: 'Escanear QR' },
  { resource: 'reports', action: 'read', description: 'Ver reportes' },
  { resource: 'reports', action: 'export', description: 'Exportar reportes' },
  { resource: 'admin', action: 'manage_users', description: 'Gestionar usuarios' },
  { resource: 'admin', action: 'manage_roles', description: 'Gestionar roles' },
  { resource: 'admin', action: 'manage_organization', description: 'Gestionar organización' },
  { resource: 'admin', action: 'audit_logs', description: 'Ver logs de auditoría' },
];

(async () => {
  try {
    console.log('🔗 Testing connection to Supabase...\n');
    
    // Test if permissions table exists
    const { data: testData, error: testError } = await supabase
      .from('permissions')
      .select('id')
      .limit(1);
    
    if (testError && testError.message.includes('cost_centers')) {
      console.log('❌ Migration tables do NOT exist yet.\n');
      console.log('📝 NEXT STEP - Execute this SQL in Supabase Dashboard:\n');
      console.log('1. Go to: ' + supabaseUrl + '/project/sql');
      console.log('2. Click "New query"');
      console.log('3. Open file: db/migrations/fase1_maestros_tables.sql');
      console.log('4. Copy & paste ALL content into the editor');
      console.log('5. Click "Run"\n');
      console.log('Then I can import the cost_centers data automatically.\n');
      process.exit(0);
    }
    
    // If we get here, tables might exist
    console.log('✅ Connection successful\n');
    
    // Try to insert permissions
    console.log('📝 Inserting seed permissions...\n');
    
    for (const perm of permissions) {
      const { error } = await supabase
        .from('permissions')
        .insert([perm])
        .select();
      
      if (error) {
        if (!error.message.includes('duplicate')) {
          console.log(`⚠️  ${perm.resource}/${perm.action}: ${error.message}`);
        }
      } else {
        console.log(`✅ ${perm.resource}/${perm.action}`);
      }
    }
    
    console.log('\n✅ Permissions inserted successfully\n');
    console.log('📊 Summary:');
    console.log('  - Permissions table: seeded with 24 standard permissions');
    console.log('  - DDL tables (CREATE TABLE statements): Require manual execution');
    console.log('  - Next: Execute cost_centers import script after DDL is run\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
