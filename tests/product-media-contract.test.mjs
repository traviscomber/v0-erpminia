import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260825140000_add_product_ai_media.sql', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/admin/product-media/route.ts', import.meta.url), 'utf8');
const procurement = await readFile(new URL('../app/api/procurement/workflow/route.ts', import.meta.url), 'utf8');
const mediaHelper = await readFile(new URL('../lib/inventory/product-media.ts', import.meta.url), 'utf8');

test('product photos stay outside canonical figures and private until approved', () => {
  assert.match(migration, /create table if not exists public\.product_media/i);
  assert.doesNotMatch(migration, /alter table canonical\.products/i);
  assert.match(migration, /values \('product-media', 'product-media', false/i);
  assert.match(migration, /revoke all on table public\.product_media from public, anon, authenticated/i);
  assert.match(migration, /where status = 'approved'/i);
});

test('only administrators can generate or review AI product photos', () => {
  assert.match(route, /requireAdmin\(request\)/);
  assert.match(route, /status: 'pending'/);
  assert.match(route, /action === 'approve'/);
  assert.match(route, /OPENAI_API_KEY/);
});

test('procurement only attaches approved product media', () => {
  assert.match(procurement, /getProductMedia\(context\.supabase, context\.organizationId/);
  assert.match(procurement, /attachProductMedia\(products, media\)/);
});

test('optional product media can never take down the canonical product catalog', () => {
  assert.match(mediaHelper, /if \(error\) \{[\s\S]*?return mediaByProduct;/);
  assert.doesNotMatch(mediaHelper, /if \(error\)[\s\S]*?throw error;/);
});
