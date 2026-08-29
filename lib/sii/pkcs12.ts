import { X509Certificate, createPrivateKey, createPublicKey } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StoredSiiCertificate } from './client';

const OPENSSL_TIMEOUT_MS = 10_000;
const MAX_OPENSSL_OUTPUT_BYTES = 2 * 1024 * 1024;

const CERTIFICATE_PATTERN = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
const PRIVATE_KEY_PATTERN = /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/;

type OpenSslResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  unavailable?: boolean;
  timedOut?: boolean;
  outputTooLarge?: boolean;
};

function runOpenSslPkcs12(filePath: string, passphrase: string, legacy: boolean): Promise<OpenSslResult> {
  return new Promise((resolve) => {
    const args = [
      'pkcs12',
      ...(legacy ? ['-legacy'] : []),
      '-in',
      filePath,
      '-nodes',
      '-passin',
      'stdin',
    ];

    const child = spawn('openssl', args, {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let settled = false;
    let timedOut = false;
    let outputTooLarge = false;

    const finish = (result: OpenSslResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const append = (target: 'stdout' | 'stderr', chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OPENSSL_OUTPUT_BYTES) {
        outputTooLarge = true;
        child.kill('SIGKILL');
        return;
      }
      if (target === 'stdout') stdout += chunk.toString('utf8');
      else stderr += chunk.toString('utf8');
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, OPENSSL_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => append('stdout', chunk));
    child.stderr.on('data', (chunk: Buffer) => append('stderr', chunk));

    child.on('error', (error: NodeJS.ErrnoException) => {
      finish({
        ok: false,
        stdout,
        stderr: '',
        unavailable: error.code === 'ENOENT',
      });
    });

    child.on('close', (code) => {
      finish({
        ok: code === 0 && !timedOut && !outputTooLarge,
        stdout,
        stderr,
        timedOut,
        outputTooLarge,
      });
    });

    // The password is written only to the child process stdin. It never appears
    // in argv, logs, environment variables, temporary filenames, or responses.
    child.stdin.end(`${passphrase}\n`);
  });
}

function shouldRetryWithLegacyProvider(stderr: string) {
  return /unsupported|inner_evp_generic_fetch|legacy provider|unknown cipher|algorithm/i.test(stderr);
}

function classifyOpenSslFailure(result: OpenSslResult): never {
  if (result.unavailable) throw new Error('SII_PKCS12_ENGINE_UNAVAILABLE');
  if (result.timedOut) throw new Error('SII_PKCS12_ENGINE_TIMEOUT');
  if (result.outputTooLarge) throw new Error('SII_PKCS12_OUTPUT_TOO_LARGE');

  const diagnostic = result.stderr.toLowerCase();
  if (/mac verify|invalid password|bad decrypt|password/i.test(diagnostic)) {
    throw new Error('SII_PKCS12_INVALID_OR_PASSWORD');
  }
  if (shouldRetryWithLegacyProvider(result.stderr)) {
    throw new Error('SII_PKCS12_UNSUPPORTED_ALGORITHM');
  }
  throw new Error('SII_PKCS12_INVALID_OR_PASSWORD');
}

function normalizeExtractedBundle(output: string): StoredSiiCertificate {
  const privateKeyMatch = output.match(PRIVATE_KEY_PATTERN);
  if (!privateKeyMatch) throw new Error('SII_PKCS12_PRIVATE_KEY_MISSING');

  let privateKey;
  try {
    privateKey = createPrivateKey(privateKeyMatch[0]);
  } catch {
    throw new Error('SII_PKCS12_PRIVATE_KEY_MISSING');
  }

  const privatePublicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  const certificateBlocks = output.match(CERTIFICATE_PATTERN) || [];
  if (certificateBlocks.length === 0) throw new Error('SII_PKCS12_CERTIFICATE_MISSING');

  let matchingCertificate: string | null = null;
  for (const certificatePem of certificateBlocks) {
    try {
      const certificate = new X509Certificate(certificatePem);
      const certificatePublicKey = certificate.publicKey.export({ format: 'der', type: 'spki' });
      if (Buffer.from(certificatePublicKey).equals(Buffer.from(privatePublicKey))) {
        matchingCertificate = certificatePem;
        break;
      }
    } catch {
      // Ignore unrelated or malformed chain entries and continue looking for the leaf cert.
    }
  }

  if (!matchingCertificate) throw new Error('SII_CERTIFICATE_KEY_MISMATCH');

  const normalizedPrivateKey = privateKey.export({ format: 'pem', type: 'pkcs8' });
  return {
    certificatePem: `${matchingCertificate.trim()}\n`,
    privateKeyPem: typeof normalizedPrivateKey === 'string'
      ? normalizedPrivateKey
      : normalizedPrivateKey.toString('utf8'),
  };
}

export async function importSiiPkcs12(
  pkcs12Bytes: Buffer,
  passphrase: string,
): Promise<StoredSiiCertificate> {
  if (!Buffer.isBuffer(pkcs12Bytes) || pkcs12Bytes.length === 0) {
    throw new Error('SII_PKCS12_INVALID_OR_PASSWORD');
  }

  const directory = await mkdtemp(join(tmpdir(), 'motil-sii-pkcs12-'));
  const filePath = join(directory, 'certificate.p12');

  try {
    await writeFile(filePath, pkcs12Bytes, { mode: 0o600, flag: 'wx' });

    let result = await runOpenSslPkcs12(filePath, passphrase, false);
    if (!result.ok && shouldRetryWithLegacyProvider(result.stderr)) {
      result = await runOpenSslPkcs12(filePath, passphrase, true);
    }
    if (!result.ok) classifyOpenSslFailure(result);

    return normalizeExtractedBundle(result.stdout);
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}
