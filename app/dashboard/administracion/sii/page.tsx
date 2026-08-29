'use client';

import { useEffect, useState } from 'react';

type SiiHealth = {
  environment?: string;
  siiReachable?: boolean;
  seedReceived?: boolean;
  authenticated?: boolean;
  tokenReceived?: boolean;
  latencyMs?: number;
  checkedAt?: string;
  error?: string;
};

type SiiConfig = {
  configured: boolean;
  environment?: string;
  companyRut?: string | null;
  certificateSubject?: string | null;
  certificateSerialNumber?: string | null;
  certificateFingerprintSha256?: string | null;
  certificateValidFrom?: string | null;
  certificateValidTo?: string | null;
  certificateUploadedAt?: string | null;
  lastAuthTestAt?: string | null;
  lastAuthOk?: boolean | null;
  lastAuthError?: string | null;
};

type CertificateMode = 'pfx' | 'pem';

function readableError(code?: string) {
  const map: Record<string, string> = {
    SII_COMPANY_RUT_INVALID: 'El RUT de la empresa no es válido.',
    SII_CERTIFICATE_INVALID: 'El certificado X.509 no es válido.',
    SII_PRIVATE_KEY_INVALID: 'La llave privada no es válida o la contraseña no corresponde.',
    SII_CERTIFICATE_KEY_MISMATCH: 'La llave privada no corresponde al certificado cargado.',
    SII_CERTIFICATE_EXPIRED: 'El certificado digital está vencido.',
    SII_CERTIFICATE_NOT_YET_VALID: 'El certificado digital todavía no está vigente.',
    SII_CERTIFICATE_NOT_CONFIGURED: 'Primero debes guardar el certificado digital.',
    SII_CERTIFICATE_SECRET_UNAVAILABLE: 'No fue posible recuperar el certificado desde el vault seguro.',
    SII_PFX_INVALID: 'El archivo PFX/P12 no es válido o no contiene certificado y llave privada.',
    SII_PFX_PASSWORD_INVALID: 'La contraseña del archivo PFX/P12 no corresponde.',
    SII_PKCS12_RUNTIME_UNAVAILABLE: 'El servidor no pudo procesar archivos PFX/P12. Usa el modo PEM avanzado.',
    SII_TIMEOUT: 'El SII no respondió dentro del tiempo esperado.',
    SII_CONNECTION_FAILED: 'No fue posible conectar con el SII.',
  };
  if (!code) return 'Ocurrió un error inesperado.';
  if (code.startsWith('SII_TOKEN_REJECTED')) return `El SII rechazó la autenticación (${code}). Verifica autorización del firmante y certificado.`;
  if (code.startsWith('SII_SEED_REJECTED')) return `El SII rechazó la solicitud de semilla (${code}).`;
  return map[code] || code;
}

export default function SiiConnectivityPage() {
  const [health, setHealth] = useState<SiiHealth | null>(null);
  const [config, setConfig] = useState<SiiConfig | null>(null);
  const [companyRut, setCompanyRut] = useState('');
  const [certificateMode, setCertificateMode] = useState<CertificateMode>('pfx');
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [privateKey, setPrivateKey] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [savingCertificate, setSavingCertificate] = useState(false);
  const [testingAuth, setTestingAuth] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function loadConfig() {
    const response = await fetch('/api/sii/config', { cache: 'no-store' });
    const data = (await response.json()) as SiiConfig & { error?: string };
    if (!response.ok) throw new Error(data.error || 'SII_CONFIG_READ_FAILED');
    setConfig(data);
    if (data.companyRut) setCompanyRut(data.companyRut);
  }

  useEffect(() => {
    void loadConfig().catch((error) => {
      setMessage({ ok: false, text: readableError(error instanceof Error ? error.message : undefined) });
    });
  }, []);

  async function testConnection() {
    setLoadingHealth(true);
    setMessage(null);
    try {
      const response = await fetch('/api/sii/health', { cache: 'no-store' });
      const data = (await response.json()) as SiiHealth;
      setHealth(data);
      setMessage({
        ok: response.ok && data.seedReceived === true,
        text: response.ok && data.seedReceived
          ? `Conectividad OK. Maullín entregó una semilla${typeof data.latencyMs === 'number' ? ` en ${data.latencyMs} ms` : ''}.`
          : readableError(data.error),
      });
    } catch {
      setMessage({ ok: false, text: 'No fue posible ejecutar la prueba de conectividad.' });
    } finally {
      setLoadingHealth(false);
    }
  }

  async function saveCertificate() {
    const hasRequiredFiles = certificateMode === 'pfx' ? Boolean(pfxFile) : Boolean(certificate && privateKey);
    if (!hasRequiredFiles) {
      setMessage({
        ok: false,
        text: certificateMode === 'pfx'
          ? 'Selecciona el archivo .pfx o .p12 del certificado digital.'
          : 'Selecciona el certificado y su llave privada.',
      });
      return;
    }

    setSavingCertificate(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set('companyRut', companyRut);
      form.set('passphrase', passphrase);
      if (certificateMode === 'pfx' && pfxFile) {
        form.set('pfx', pfxFile);
      } else if (certificate && privateKey) {
        form.set('certificate', certificate);
        form.set('privateKey', privateKey);
      }

      const response = await fetch('/api/sii/config', { method: 'POST', body: form });
      const data = (await response.json()) as SiiConfig & { error?: string };
      if (!response.ok) throw new Error(data.error || 'SII_CERTIFICATE_CONFIGURATION_FAILED');

      setConfig(data);
      setPfxFile(null);
      setCertificate(null);
      setPrivateKey(null);
      setPassphrase('');
      setMessage({ ok: true, text: 'Certificado validado y guardado cifrado en el vault de Motil.' });
      await loadConfig();
    } catch (error) {
      setMessage({ ok: false, text: readableError(error instanceof Error ? error.message : undefined) });
    } finally {
      setSavingCertificate(false);
    }
  }

  async function testAuthentication() {
    setTestingAuth(true);
    setMessage(null);
    try {
      const response = await fetch('/api/sii/auth-test', { method: 'POST' });
      const data = (await response.json()) as SiiHealth;
      setHealth((current) => ({ ...current, ...data }));
      if (!response.ok || !data.authenticated) throw new Error(data.error || 'SII_AUTHENTICATION_FAILED');
      setMessage({
        ok: true,
        text: `Autenticación SII OK: semilla firmada y token obtenido${typeof data.latencyMs === 'number' ? ` en ${data.latencyMs} ms` : ''}. El token no se expone al navegador.`,
      });
      await loadConfig();
    } catch (error) {
      setMessage({ ok: false, text: readableError(error instanceof Error ? error.message : undefined) });
      await loadConfig().catch(() => undefined);
    } finally {
      setTestingAuth(false);
    }
  }

  const connected = health?.siiReachable === true && health?.seedReceived === true;
  const certificateOk = config?.configured === true && Boolean(config.certificateValidTo) && Date.parse(config.certificateValidTo || '') > Date.now();
  const authenticated = health?.authenticated === true || config?.lastAuthOk === true;
  const canSaveCertificate = Boolean(companyRut) && (certificateMode === 'pfx' ? Boolean(pfxFile) : Boolean(certificate && privateKey));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Administración · Integraciones</p>
        <h1 className="text-3xl font-semibold tracking-tight">Servicio de Impuestos Internos</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Integración programa a programa con el ambiente de certificación del SII. Motil prueba conectividad, firma la semilla con el certificado del firmante y solicita un token sin exponer credenciales al navegador.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Status label="Ambiente" value="CERTIFICACIÓN" ok />
          <Status label="Conectividad" value={connected ? 'SII disponible' : health ? 'Sin conexión' : 'Sin probar'} ok={health ? connected : undefined} />
          <Status label="Certificado" value={certificateOk ? 'Vigente' : config?.configured ? 'Revisar vigencia' : 'No configurado'} ok={config ? certificateOk : undefined} />
          <Status label="Autenticación" value={authenticated ? 'Token obtenido' : config?.lastAuthOk === false ? 'Última prueba falló' : 'Pendiente'} ok={config?.lastAuthOk === false ? false : authenticated ? true : undefined} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={testConnection}
            disabled={loadingHealth}
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingHealth ? 'Probando conexión…' : '1. Probar conexión'}
          </button>
          <button
            type="button"
            onClick={testAuthentication}
            disabled={testingAuth || !certificateOk}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testingAuth ? 'Firmando y autenticando…' : '3. Probar autenticación SII'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">2. Certificado digital del firmante</p>
          <p className="text-sm text-muted-foreground">
            La opción recomendada acepta directamente el archivo .pfx/.p12 entregado por el proveedor del certificado. Motil extrae y valida el certificado y la llave privada en el servidor, y guarda el material cifrado en Supabase Vault.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">RUT empresa</span>
            <input
              value={companyRut}
              onChange={(event) => setCompanyRut(event.target.value)}
              placeholder="76.123.456-7"
              className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCertificateMode('pfx')}
              className={`rounded-lg border p-4 text-left ${certificateMode === 'pfx' ? 'border-primary bg-primary/5' : ''}`}
            >
              <p className="text-sm font-semibold">PFX / P12 · Recomendado</p>
              <p className="mt-1 text-xs text-muted-foreground">Un solo archivo + contraseña. Es el formato habitual de certificados digitales en Chile.</p>
            </button>
            <button
              type="button"
              onClick={() => setCertificateMode('pem')}
              className={`rounded-lg border p-4 text-left ${certificateMode === 'pem' ? 'border-primary bg-primary/5' : ''}`}
            >
              <p className="text-sm font-semibold">PEM · Avanzado</p>
              <p className="mt-1 text-xs text-muted-foreground">Certificado X.509 y llave privada en archivos separados.</p>
            </button>
          </div>

          {certificateMode === 'pfx' ? (
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">Certificado digital PFX/P12</span>
              <input
                type="file"
                accept=".pfx,.p12,application/x-pkcs12"
                onChange={(event) => setPfxFile(event.target.files?.[0] || null)}
                className="block w-full rounded-md border bg-background p-2 text-sm"
              />
              <span className="block text-xs text-muted-foreground">Máximo 2 MB. El archivo original no queda almacenado: se convierte y valida antes de entrar al vault.</span>
            </label>
          ) : (
            <>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Certificado público</span>
                <input
                  type="file"
                  accept=".pem,.crt,.cer,text/plain,application/x-pem-file"
                  onChange={(event) => setCertificate(event.target.files?.[0] || null)}
                  className="block w-full rounded-md border bg-background p-2 text-sm"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Llave privada</span>
                <input
                  type="file"
                  accept=".pem,.key,text/plain,application/x-pem-file"
                  onChange={(event) => setPrivateKey(event.target.files?.[0] || null)}
                  className="block w-full rounded-md border bg-background p-2 text-sm"
                />
              </label>
            </>
          )}

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">Contraseña {certificateMode === 'pfx' ? 'del PFX/P12' : 'de la llave privada'}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder={certificateMode === 'pfx' ? 'Contraseña entregada con el certificado' : 'Sólo si la llave está cifrada'}
              className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="block text-xs text-muted-foreground">La contraseña se usa sólo en el servidor y nunca vuelve a mostrarse en la interfaz.</span>
          </label>
        </div>

        <button
          type="button"
          onClick={saveCertificate}
          disabled={savingCertificate || !canSaveCertificate}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingCertificate ? 'Validando y guardando…' : 'Guardar certificado seguro'}
        </button>

        {config?.configured && (
          <div className="mt-5 grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm md:grid-cols-2">
            <Detail label="RUT empresa" value={config.companyRut || '—'} />
            <Detail label="Vigencia" value={config.certificateValidTo ? new Date(config.certificateValidTo).toLocaleDateString('es-CL') : '—'} />
            <Detail label="Titular" value={config.certificateSubject || '—'} />
            <Detail label="Huella SHA-256" value={config.certificateFingerprintSha256 || '—'} mono />
          </div>
        )}
      </section>

      {message && (
        <div className={`rounded-lg border p-4 text-sm ${message.ok ? 'bg-muted/40' : 'bg-destructive/5'}`}>
          <p className="font-semibold">{message.ok ? 'Operación completada' : 'No se pudo completar'}</p>
          <p className="mt-1 text-muted-foreground">{message.text}</p>
        </div>
      )}

      <section className="rounded-xl border p-5 text-sm">
        <p className="font-semibold">Siguiente bloque después de autenticación</p>
        <p className="mt-1 text-muted-foreground">
          CAF y rangos de folios → reserva transaccional de folio → generación DTE → TED → firma XML → envío y TrackID.
        </p>
      </section>
    </main>
  );
}

function Status({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${ok === true ? 'bg-emerald-500' : ok === false ? 'bg-red-500' : 'bg-slate-400'}`} />
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 break-all ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</p>
    </div>
  );
}
