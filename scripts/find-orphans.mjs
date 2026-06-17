import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  (process.env.SUPABASE_URL || '').replace(/['"]/g, ''),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, ''),
  { auth: { persistSession: false } },
);

const R = '\uFFFD';

// Reconstruct CSV SKUs the same way the import did (accents reconstructed)
let content = fs.readFileSync('scripts/bodega-fixed.csv', 'utf-8');
if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
const lines = content.split(/\r?\n/).filter(Boolean).slice(1);

const skuFix = [
  ['El' + R + 'ctrico', 'Eléctrico'],
  ['Ferreter' + R + 'a', 'Ferretería'],
  ['Neum' + R + 'tico', 'Neumático'],
  ['Fortificaci' + R + 'n', 'Fortificación'],
  ['Perforaci' + R + 'n', 'Perforación'],
];
function fixSku(sku) {
  for (const [b, g] of skuFix) sku = sku.split(b).join(g);
  return sku;
}
const csvSkus = new Set(lines.map((l) => fixSku(l.split(';')[0])));

let all = [];
let from = 0;
while (true) {
  const { data } = await supabase
    .from('bodega_inventory')
    .select('sku,name,category')
    .range(from, from + 999);
  if (!data || !data.length) break;
  all = all.concat(data);
  from += 1000;
  if (data.length < 1000) break;
}
const orphans = all.filter((r) => !csvSkus.has(r.sku));
console.log('DB total:', all.length, '| CSV SKUs:', csvSkus.size);
console.log('Huérfanos (en DB, no en CSV):', orphans.length);
orphans.forEach((o) => console.log('  ', JSON.stringify(o.sku), '|', o.name, '|', o.category));

if (process.argv.includes('--delete') && orphans.length > 0) {
  const skus = orphans.map((o) => o.sku);
  const { error, count } = await supabase
    .from('bodega_inventory')
    .delete({ count: 'exact' })
    .in('sku', skus);
  console.log('\nEliminados:', count, error?.message || 'OK');
}
