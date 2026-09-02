import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20260901234500_harden_product_media_autopilot.sql', import.meta.url),
  'utf8',
);
const edge = await readFile(
  new URL('../supabase/functions/motil-media-autopilot/index.ts', import.meta.url),
  'utf8',
);

test('representative media classifier excludes known specific-spare patterns', () => {
  assert.doesNotMatch(migration, /seal_single_oring/);
  assert.match(migration, /dentad\|sincr\[oó\]nic\|timing\|distribuci\[oó\]n/);
  assert.match(migration, /toyota\|jcb\|cat\|john deere\|cummins\|atlas\|epiroc/);
  assert.match(migration, /bomba\|eje\|rueda\|freno\|pasador\|tirante/);
});

test('representative media is limited to explicit visual groups', () => {
  for (const group of [
    'fastener_hex_bolt_standard',
    'fastener_hex_nut_standard',
    'fastener_flat_washer',
    'electrical_mini_blade_fuse',
    'electrical_pg_cable_gland',
    'fastener_self_drilling_hex_screw',
    'clamp_worm_drive_hose',
    'belt_v_standard',
  ]) {
    assert.match(migration, new RegExp(group));
  }
});

test('autopilot requires its internal key and only auto-approves high-confidence candidates', () => {
  assert.match(edge, /x-motil-media-key/);
  assert.match(edge, /production_internal_stage_auth/);
  assert.match(edge, /const AUTO = 0\.9/);
  assert.match(edge, /status: auto \? 'approved' : 'pending'/);
});

test('autopilot protects existing active media and cleans up failed uploads', () => {
  assert.match(edge, /\.in\('status', \['approved', 'pending'\]\)/);
  assert.match(edge, /storage\.from\('product-media'\)\.remove\(\[path\]\)/);
  assert.match(edge, /AUTOPILOT FAILED:/);
});

test('autopilot rejects branding and placeholder images resolved from page metadata', () => {
  assert.match(edge, /function isLikelyBrandingImage/);
  for (const marker of ['logo', 'favicon', 'site-logo', 'brandmark', 'placeholder', 'no[-_]?image', 'default-avatar', 'sprite']) {
    assert.match(edge, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(edge, /branding\/logo en vez de imagen de producto/);
  assert.match(edge, /parece branding\/logo, no imagen de producto/);
});

test('autopilot can resolve schema.org Product images when social metadata is absent', () => {
  assert.match(edge, /application\\\/ld\\\+json/);
  assert.match(edge, /function jsonLdProductImage/);
  assert.match(edge, /function productImageFromJsonLdNode/);
  assert.match(edge, /t\.toLowerCase\(\) === 'product'/);
  assert.match(edge, /imageValue\(node\.image, b\)/);
  assert.match(edge, /pageProductImage/);
  assert.match(edge, /metadata o JSON-LD/);
});
