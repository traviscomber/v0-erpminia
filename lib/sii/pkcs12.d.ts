export function pkcs12ToPemBundle(
  pfxBuffer: Buffer,
  passphrase?: string,
): Promise<{ certificatePem: string; privateKeyPem: string }>;
