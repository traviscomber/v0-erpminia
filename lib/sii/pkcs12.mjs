import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const MAX_BUFFER = 2 * 1024 * 1024;

function extractPem(text, labelPattern) {
  const match = text.match(new RegExp(`-----BEGIN (${labelPattern})-----[\\s\\S]+?-----END \\1-----`));
  return match?.[0] || null;
}

function classifyPkcs12Error(error) {
  if (error && typeof error === 'object' && error.code === 'ENOENT') {
    return new Error('SII_PKCS12_RUNTIME_UNAVAILABLE');
  }

  const stderr = String(error?.stderr || error?.message || '');
  if (/invalid password|mac verify error|mac verify failure|bad decrypt|cipherfinal error/i.test(stderr)) {
    return new Error('SII_PFX_PASSWORD_INVALID');
  }
  return new Error('SII_PFX_INVALID');
}

async function runOpenSsl(inputPath, passphrase, legacy) {
  const args = ['pkcs12', '-in', inputPath, '-nodes', '-clcerts', '-passin', 'env:SII_PFX_PASSWORD'];
  if (legacy) args.push('-legacy');

  return execFile('openssl', args, {
    env: { ...process.env, SII_PFX_PASSWORD: passphrase || '' },
    maxBuffer: MAX_BUFFER,
    windowsHide: true,
  });
}

export async function pkcs12ToPemBundle(pfxBuffer, passphrase = '') {
  if (!Buffer.isBuffer(pfxBuffer) || pfxBuffer.length === 0) {
    throw new Error('SII_PFX_INVALID');
  }

  const directory = await mkdtemp(join(tmpdir(), 'motil-sii-pfx-'));
  const inputPath = join(directory, 'certificate.p12');

  try {
    await writeFile(inputPath, pfxBuffer, { mode: 0o600 });

    let output;
    try {
      output = await runOpenSsl(inputPath, passphrase, false);
    } catch (error) {
      const stderr = String(error?.stderr || error?.message || '');
      if (/unsupported|legacy provider|unknown pbe algorithm/i.test(stderr)) {
        try {
          output = await runOpenSsl(inputPath, passphrase, true);
        } catch (legacyError) {
          throw classifyPkcs12Error(legacyError);
        }
      } else {
        throw classifyPkcs12Error(error);
      }
    }

    const stdout = String(output?.stdout || '');
    const certificatePem = extractPem(stdout, 'CERTIFICATE');
    const privateKeyPem = extractPem(stdout, '(?:RSA )?PRIVATE KEY');

    if (!certificatePem || !privateKeyPem) {
      throw new Error('SII_PFX_INVALID');
    }

    return {
      certificatePem: `${certificatePem.trim()}\n`,
      privateKeyPem: `${privateKeyPem.trim()}\n`,
    };
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}
