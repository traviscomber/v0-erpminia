import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const migration = fs.readFileSync('supabase/migrations/20260829143807_add_sii_certificate_vault_config_v1.sql','utf8');
const client = fs.readFileSync('lib/sii/client.ts','utf8');
const pkcs12 = fs.readFileSync('lib/sii/pkcs12.ts','utf8');
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
  assert.match(configApi,/MAX_PKCS12_BYTES/);
  assert.match(configApi,/p_secret_payload: JSON\.stringify\(bundle\)/);

  const successResponse = configApi.match(/return NextResponse\.json\(\{\n\s+configured: true,[\s\S]*?lastAuthOk: null,\n\s+\}\);/);
  assert.ok(successResponse, 'certificate POST must return an explicit metadata-only success object');
  assert.doesNotMatch(successResponse[0],/privateKeyPem|passphrase|certificatePem|p_secret_payload|pkcs12Bytes/);

  const publicConfigBody = configApi.match(/function publicConfig\(row: any\) \{[\s\S]*?\n\}/);
  assert.ok(publicConfigBody, 'GET response must be projected through publicConfig');
  assert.doesNotMatch(publicConfigBody[0],/privateKeyPem|passphrase|certificatePem|decrypted_secret|pkcs12/);
});

test('direct PKCS12 import is bounded, shell-free and never passes password through argv or env',()=>{
  assert.match(configApi,/form\.get\('pkcs12'\)/);
  assert.match(configApi,/importSiiPkcs12\(Buffer\.from\(await pkcs12File\.arrayBuffer\(\)\), passphrase\)/);
  assert.match(configApi,/hasPkcs12 && \(hasCertificate \|\| hasPrivateKey\)/);
  assert.match(pkcs12,/spawn\('openssl', args/);
  assert.match(pkcs12,/shell: false/);
  assert.match(pkcs12,/'-passin',\n\s+'stdin'/);
  assert.match(pkcs12,/child\.stdin\.end\(`\$\{passphrase\}\\n`\)/);
  assert.doesNotMatch(pkcs12,/process\.env.*passphrase|passphrase.*process\.env/);
  assert.match(pkcs12,/mode: 0o600/);
  assert.match(pkcs12,/MAX_OPENSSL_OUTPUT_BYTES/);
  assert.match(pkcs12,/OPENSSL_TIMEOUT_MS/);
  assert.match(pkcs12,/rm\(directory, \{ recursive: true, force: true \}\)/);
});

test('PKCS12 extraction matches leaf certificate to private key and normalizes to PKCS8',()=>{
  assert.match(pkcs12,/createPublicKey\(privateKey\)/);
  assert.match(pkcs12,/certificate\.publicKey\.export/);
  assert.match(pkcs12,/Buffer\.from\(certificatePublicKey\)\.equals\(Buffer\.from\(privatePublicKey\)\)/);
  assert.match(pkcs12,/type: 'pkcs8'/);
  assert.match(pkcs12,/shouldRetryWithLegacyProvider/);
  assert.match(pkcs12,/'-legacy'/);
});

test('Vercel build image exposes the OpenSSL PKCS12 engine required by the importer',()=>{
  const result = spawnSync('openssl', ['version'], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || 'openssl version failed');
  assert.match(result.stdout, /^OpenSSL\s+/);
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
  assert.match(page,/PFX \/ P12 · recomendado/);
  assert.match(page,/PEM · avanzado/);
  assert.match(page,/accept="\.pfx,\.p12,application\/x-pkcs12"/);
  assert.match(page,/no necesitas convertirlo a PEM/);
  assert.match(page,/CAF y rangos de folios/);
  assert.doesNotMatch(page,/debe exportarse a PEM antes de cargarlo/);
  assert.doesNotMatch(page,/window\.prompt/);
});
