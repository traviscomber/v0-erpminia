import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260829143807_add_sii_certificate_vault_config_v1.sql','utf8');
const client = fs.readFileSync('lib/sii/client.ts','utf8');
const configApi = fs.readFileSync('app/api/sii/config/route.ts','utf8');
const authApi = fs.readFileSync('app/api/sii/auth-test/route.ts','utf8');
const healthApi = fs.readFileSync('app/api/sii/health/route.ts','utf8');
const page = fs.readFileSync('app/dashboard/administracion/sii/page.tsx','utf8');

test('SII certificate metadata is server-only and secret material is stored in Supabase Vault',()=>{
  assert.match(migration,/create table if not exists public\.sii_integrations/);
  assert.match(migration,/alter table public\.sii_integrations enable row level security/);
  assert.match(migration,/revoke all on public\.sii_integrations from public, anon, authenticated/);
  assert.match(migration,/vault\.create_secret/);
  assert.match(migration,/vault\.update_secret/);
  assert.match(migration,/vault\.decrypted_secrets/);
  assert.match(migration,/grant execute on function public\.get_sii_certificate_payload_v1\(uuid\) to service_role/);
  assert.doesNotMatch(migration,/grant execute on function public\.get_sii_certificate_payload_v1\(uuid\) to authenticated/);
});

test('certificate upload requires admin context and response contract contains metadata only',()=>{
  assert.match(configApi,/requireAdmin\(request\)/);
  assert.match(configApi,/request\.formData\(\)/);
  assert.match(configApi,/inspectSiiCertificate\(bundle\)/);
  assert.match(configApi,/save_sii_certificate_v1/);
  assert.match(configApi,/MAX_CERTIFICATE_BYTES/);
  assert.match(configApi,/MAX_PRIVATE_KEY_BYTES/);
  assert.match(configApi,/p_secret_payload: JSON\.stringify\(bundle\)/);

  const successResponse = configApi.match(/return NextResponse\.json\(\{\n\s+configured: true,[\s\S]*?lastAuthOk: null,\n\s+\}\);/);
  assert.ok(successResponse, 'certificate POST must return an explicit metadata-only success object');
  assert.doesNotMatch(successResponse[0],/privateKeyPem|passphrase|certificatePem|p_secret_payload/);

  const publicConfigBody = configApi.match(/function publicConfig\(row: any\) \{[\s\S]*?\n\}/);
  assert.ok(publicConfigBody, 'GET response must be projected through publicConfig');
  assert.doesNotMatch(publicConfigBody[0],/privateKeyPem|passphrase|certificatePem|decrypted_secret/);
});

test('SII authentication follows seed sign token and does not expose the token',()=>{
  assert.match(authApi,/requireAdmin\(request\)/);
  assert.match(authApi,/get_sii_certificate_payload_v1/);
  assert.match(authApi,/requestSiiSeed\(\)/);
  assert.match(authApi,/signSiiSeed\(seedResult\.seed, bundle\)/);
  assert.match(authApi,/requestSiiToken\(signedSeedXml\)/);
  assert.match(authApi,/tokenReceived: Boolean\(tokenResult\.token\)/);
  assert.doesNotMatch(authApi,/token:\s*tokenResult\.token/);
  assert.match(authApi,/record_sii_auth_test_v1/);
});

test('SII signing client implements the XMLDSIG contract required by SII',()=>{
  assert.match(client,/rsa-sha1/);
  assert.match(client,/REC-xml-c14n-20010315/);
  assert.match(client,/enveloped-signature/);
  assert.match(client,/createHash\('sha1'\)/);
  assert.match(client,/createSign\('RSA-SHA1'\)/);
  assert.match(client,/<X509Certificate>/);
  assert.match(client,/<Modulus>/);
  assert.match(client,/<Exponent>/);
  assert.match(client,/GetTokenFromSeed\.jws/);
});

test('health and administration UI share the canonical SII client and progressive setup',()=>{
  assert.match(healthApi,/requestSiiSeed/);
  assert.match(page,/Guardar certificado seguro/);
  assert.match(page,/Probar autenticación SII/);
  assert.match(page,/Supabase Vault/);
  assert.match(page,/CAF y rangos de folios/);
  assert.doesNotMatch(page,/window\.prompt/);
});
