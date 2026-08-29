import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 15_000,
    ...options,
  });
  assert.equal(result.error, undefined, `${command} failed to start`);
  assert.equal(result.status, 0, result.stderr || `${command} exited with ${result.status}`);
  return result;
}

function exerciseImporter(pkcs12Path, password) {
  const script = `
    import { readFileSync } from 'node:fs';
    const { importSiiPkcs12 } = await import('./lib/sii/pkcs12.ts');
    try {
      const bundle = await importSiiPkcs12(readFileSync(process.argv[1]), process.argv[2]);
      process.stdout.write(JSON.stringify({
        ok: true,
        certificate: bundle.certificatePem.includes('BEGIN CERTIFICATE'),
        privateKey: bundle.privateKeyPem.includes('BEGIN PRIVATE KEY'),
        storesPassphrase: Object.prototype.hasOwnProperty.call(bundle, 'passphrase'),
      }));
    } catch (error) {
      process.stdout.write(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'UNKNOWN' }));
    }
  `;
  const result = run(process.execPath, [
    '--no-warnings',
    '--experimental-strip-types',
    '--input-type=module',
    '-e',
    script,
    pkcs12Path,
    password,
  ]);
  return JSON.parse(result.stdout);
}

test('direct SII PKCS12 importer extracts a real RSA certificate and rejects a wrong password', () => {
  const directory = mkdtempSync(join(tmpdir(), 'motil-sii-pkcs12-test-'));
  const keyPath = join(directory, 'key.pem');
  const certPath = join(directory, 'cert.pem');
  const pkcs12Path = join(directory, 'certificate.p12');
  const password = 'motil-uat-pkcs12';

  try {
    run('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048',
      '-keyout', keyPath,
      '-out', certPath,
      '-sha256', '-days', '1', '-nodes',
      '-subj', '/CN=Motil PKCS12 Integration Test',
    ]);

    run('openssl', [
      'pkcs12', '-export',
      '-out', pkcs12Path,
      '-inkey', keyPath,
      '-in', certPath,
      '-passout', `pass:${password}`,
    ]);

    assert.ok(readFileSync(pkcs12Path).length > 0);

    const imported = exerciseImporter(pkcs12Path, password);
    assert.deepEqual(imported, {
      ok: true,
      certificate: true,
      privateKey: true,
      storesPassphrase: false,
    });

    const rejected = exerciseImporter(pkcs12Path, 'incorrect-password');
    assert.deepEqual(rejected, {
      ok: false,
      error: 'SII_PKCS12_INVALID_OR_PASSWORD',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
