import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('Key:', supabaseKey ? 'SET' : 'NOT SET');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function check() {
  console.log('\n=== Checking Bodega Inventory ===\n');
  
  // Check first 5 items
  const { data: items, error: itemsError } = await supabase
    .from('bodega_inventory')
    .select('sku, name, category')
    .limit(5);

  if (itemsError) {
    console.error('Error fetching items:', itemsError.message);
    return;
  }

  console.log('First 5 items:');
  items.forEach((item, i) => {
    console.log(`${i + 1}. SKU: ${item.sku}`);
    console.log(`   Name: ${item.name}`);
    console.log(`   Category: ${item.category}`);
  });

  // Check total count
  const { count, error: countError } = await supabase
    .from('bodega_inventory')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\nTotal items in bodega_inventory: ${count}`);
  }
}

check();
