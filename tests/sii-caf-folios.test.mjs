import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260829151510_add_sii_caf_folio_inventory_v1.sql', 'utf8');
const parser = fs.readFileSync('lib/sii/caf.ts', 'utf8');
const api = fs.readFileSync('app/api/sii/cafs/route.ts', 'utf8');
const page = fs.readFileSync('app/dashboard/administracion/sii/page.tsx', 'utf8');

test('CAF secret material stays server-only and encrypted in Vault', () => {
  assert.match(migration, /create table public\.sii_cafs/);
  assert.match(migration, /alter table public\.sii_cafs enable row level security/);
  assert.match(migration, /revoke all on public\.sii_cafs from public, anon, authenticated/);
  assert.match(migration, /revoke insert, update, delete on public\.sii_cafs from service_role/);
  assert.match(migration, /vault\.create_secret/);
  assert.match(migration, /get_sii_caf_payload_v1/);
  assert.match(migration, /grant execute on function public\.get_sii_caf_payload_v1\(uuid,uuid\) to service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.get_sii_caf_payload_v1\(uuid,uuid\) to authenticated/);

  const publicProjection = api.match(/function publicCaf\(row: any\) \{[\s\S]*?\n\}/);
  assert.ok(publicProjection, 'CAF API must explicitly project public metadata');
  assert.doesNotMatch(publicProjection[0], /secret_id|secretId|secret_payload|authorizationXml|privateKey/);
});

test('CAF validation binds RUT range and private key to the authorized public key', () => {
  assert.match(parser, /<AUTORIZACION/);
  assert.match(parser, /extractBlock\(authorizationXml, 'CAF'\)/);
  assert.match(parser, /extractTag\(authorizationXml, 'RSASK'\)/);
  assert.match(parser, /extractBlock\(daXml, 'RSAPK'\)/);
  assert.match(parser, /signatureAlgorithm\.toLowerCase\(\) !== 'sha1withrsa'/);
  assert.match(parser, /normalizeCompanyRut\(expectedCompanyRut\)/);
  assert.match(parser, /SII_CAF_COMPANY_RUT_MISMATCH/);
  assert.match(parser, /createPrivateKey\(privateKeyPem\)/);
  assert.match(parser, /createPublicKey\(privateKey\)\.export/);
  assert.match(parser, /cafModulus\.equals\(privateModulus\)/);
  assert.match(parser, /cafExponent\.equals\(privateExponent\)/);
  assert.match(parser, /createHash\('sha256'\)/);
});

test('folio allocation is atomic idempotent and never recycles a used folio', () => {
  assert.match(migration, /constraint sii_folio_unique unique \(organization_id, environment, document_type, folio\)/);
  assert.match(migration, /constraint sii_folio_idempotency_unique unique \(organization_id, environment, idempotency_key\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /int8range\(c\.range_start, c\.range_end, '\[\]'\) && int8range\(p_range_start, p_range_end, '\[\]'\)/);
  assert.match(migration, /where r\.organization_id = p_organization_id[\s\S]*r\.idempotency_key = p_idempotency_key/);
  assert.match(migration, /for update/);
  assert.match(migration, /set next_folio = v_folio \+ 1/);
  assert.match(migration, /if v_status = 'used' then raise exception 'Un folio SII usado no puede anularse'/);
  assert.match(migration, /status in \('reserved','used','voided'\)/);
});

test('CAF API is admin scoped tenant scoped and progressive UI exposes inventory only', () => {
  assert.match(api, /requireAdmin\(request\)/g);
  assert.match(api, /\.eq\('organization_id', auth\.organizationId\)/);
  assert.match(api, /parseAndValidateSiiCaf/);
  assert.match(api, /save_sii_caf_v1/);
  assert.match(api, /MAX_CAF_BYTES/);
  assert.match(page, /4\. CAF y rangos de folios/);
  assert.match(page, /Guardar CAF seguro/);
  assert.match(page, /folios se reservan atómicamente/);
  assert.match(page, /DTE 33 → reserva idempotente de folio/);
  assert.doesNotMatch(page, /window\.prompt/);
});
