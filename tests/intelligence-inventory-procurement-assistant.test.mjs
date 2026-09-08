import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const widgetUrl = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url);
const runtimeUrl = new URL('../lib/intelligence/operational-domain-assistant.ts', import.meta.url);
const inventoryRouteUrl = new URL('../app/api/inventory/assistant/route.ts', import.meta.url);
const procurementRouteUrl = new URL('../app/api/procurement/assistant/route.ts', import.meta.url);
const inventoryIntelligenceUrl = new URL('../app/api/inventory/intelligence/route.ts', import.meta.url);

test('inventory and procurement use the shared specialist conversation body', async () => {
  const widget = await readFile(widgetUrl, 'utf8');
  assert.match(widget, /\/api\/inventory\/assistant/);
  assert.match(widget, /\/api\/procurement\/assistant/);
  assert.match(widget, /SpecialistAssistantBody/);
  assert.match(widget, /inventoryToolCopy/);
  assert.match(widget, /procurementToolCopy/);
});

test('local module permission is mandatory and cross-domain expansion is permission bounded', async () => {
  const [inventoryRoute, procurementRoute, inventoryIntelligence] = await Promise.all([
    readFile(inventoryRouteUrl, 'utf8'),
    readFile(procurementRouteUrl, 'utf8'),
    readFile(inventoryIntelligenceUrl, 'utf8'),
  ]);

  assert.match(inventoryRoute, /MODULE_KEYS\.BODEGA_INVENTARIO/);
  assert.match(inventoryRoute, /MODULE_KEYS\.FIN_COMPRAS/);
  assert.match(inventoryRoute, /procurementAccess\.authorized \? \['inventory', 'procurement'\] : \['inventory'\]/);

  assert.match(procurementRoute, /MODULE_KEYS\.FIN_COMPRAS/);
  assert.match(procurementRoute, /MODULE_KEYS\.BODEGA_INVENTARIO/);
  assert.match(procurementRoute, /inventoryAccess\.authorized \? \['procurement', 'inventory'\] : \['procurement'\]/);

  assert.match(inventoryIntelligence, /requireModuleAccess\(request, MODULE_KEYS\.BODEGA_INVENTARIO\)/);
});

test('shared runtime stays read-only, canonical, freshness-aware and module-first', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');
  assert.match(runtime, /routeOperationalQuery\(message, \{ domain \}\)/);
  assert.match(runtime, /requiresExplicitAuthorization/);
  assert.match(runtime, /READ_ONLY/);
  assert.match(runtime, /canonical_inventory_current/);
  assert.match(runtime, /canonical_purchase_orders_current/);
  assert.match(runtime, /inventory_intelligence_overview_v1/);
  assert.match(runtime, /procurement_overview/);
  assert.match(runtime, /latest_snapshot_date/);
  assert.match(runtime, /latest_order_date/);
  assert.match(runtime, /No presentes un snapshot antiguo como tiempo real/);
  assert.match(runtime, /No ejecutes compras, reservas, ajustes de stock, recepciones, aprobaciones/);
  assert.doesNotMatch(runtime, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
});
