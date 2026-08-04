// Drives the canonical import endpoint to completion, dataset by dataset.
// Usage: node --env-file=/vercel/share/.env.project scripts/run-canonical-import.mjs

const BASE = process.env.IMPORT_BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.ADMIN_INIT_TOKEN;
const LIMIT = Number(process.env.IMPORT_LIMIT || 5000);

if (!TOKEN) {
  console.error('[import] ADMIN_INIT_TOKEN missing in env');
  process.exit(1);
}

async function call(body) {
  const res = await fetch(`${BASE}/api/admin/canonical-import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': TOKEN },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`${body.dataset}/${body.action || 'slice'} -> ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function runSliced(dataset) {
  console.log(`\n[import] === ${dataset} ===`);
  const begin = await call({ dataset, action: 'begin' });
  const { batchId, total } = begin;
  console.log(`[import] ${dataset} begin: total=${total} batch=${batchId}`);
  let offset = 0;
  let affectedTotal = 0;
  while (true) {
    const r = await call({ dataset, action: 'slice', batchId, offset, limit: LIMIT });
    affectedTotal += r.affected || 0;
    console.log(`[import] ${dataset} slice offset=${r.offset} processed=${r.processed} affected=${r.affected} next=${r.nextOffset}/${r.total}`);
    if (r.done) break;
    offset = r.nextOffset;
  }
  const finish = await call({ dataset, action: 'finish', batchId });
  console.log(`[import] ${dataset} done. affected=${affectedTotal}`);
  return finish.counts;
}

async function main() {
  await runSliced('lines');
  await runSliced('asset_costs');
  // assets is a single-shot SQL derivation off asset_costs
  const assets = await call({ dataset: 'assets' });
  console.log(`\n[import] assets derived: inserted=${assets.inserted}`);
  const finalCounts = await runSliced('products');
  console.log('\n[import] FINAL COUNTS:', JSON.stringify(finalCounts, null, 2));
}

main().catch((err) => {
  console.error('[import] FAILED:', err.message);
  process.exit(1);
});
