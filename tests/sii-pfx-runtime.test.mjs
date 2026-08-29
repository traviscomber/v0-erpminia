import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { X509Certificate, createPrivateKey, createPublicKey } from 'node:crypto';
import { pkcs12ToPemBundle } from '../lib/sii/pkcs12.mjs';

const execFile = promisify(execFileCallback);

test('PKCS12 runtime converts a password-protected PFX into a matching certificate and key', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'motil-sii-pfx-test-'));
  const keyPath = join(directory, 'key.pem');
  const certPath = join(directory, 'cert.pem');
  const pfxPath = join(directory, 'bundle.p12');
  const password = 'motil-pfx-test-password';

  try {
    const version = await execFile('openssl', ['version']);
    assert.match(String(version.stdout), /OpenSSL/i);

    await execFile('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', keyPath,
      '-out', certPath,
      '-sha256', '-days', '1',
      '-subj', '/CN=Motil SII PKCS12 Runtime Test',
    ]);

    await execFile('openssl', [
      'pkcs12', '-export',
      '-out', pfxPath,
      '-inkey', keyPath,
      '-in', certPath,
      '-passout', `pass:${password}`,
    ]);

    const converted = await pkcs12ToPemBundle(await readFile(pfxPath), password);
    assert.match(converted.certificatePem, /BEGIN CERTIFICATE/);
    assert.match(converted.privateKeyPem, /BEGIN (?:RSA )?PRIVATE KEY/);

    const certificate = new X509Certificate(converted.certificatePem);
    const privateKey = createPrivateKey(converted.privateKeyPem);
    const certificatePublicKey = certificate.publicKey.export({ format: 'der', type: 'spki' });
    const privatePublicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
    assert.deepEqual(Buffer.from(certificatePublicKey), Buffer.from(privatePublicKey));

    await assert.rejects(
      () => pkcs12ToPemBundle(readFile(pfxPath).then((buffer) => buffer), 'wrong-password'),
      /SII_PFX_INVALID|SII_PFX_PASSWORD_INVALID/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
