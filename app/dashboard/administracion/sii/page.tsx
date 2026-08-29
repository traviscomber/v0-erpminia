'use client';

import { useEffect, useMemo, useState } from 'react';

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

type SiiCaf = {
  id: string;
  environment: string;
  companyRut: string;
  documentType: number;
  rangeStart: number;
  rangeEnd: number;
  nextFolio: number;
  availableFolios: number;
  authorizationDate: string;
  cafVersion: string;
  keyId: number | null;
  signatureAlgorithm: string | null;
  fingerprintSha256: string;
  status: 'active' | 'exhausted' | 'disabled';
  uploadedAt: string;
  exhaustedAt: string | null;
};

type UploadMode = 'pkcs12' | 'pem';

const DTE_LABELS: Record<number, string> = {
  33: 'Factura electrónica',
  34: 'Factura exenta',
  39: 'Boleta electrónica',
  41: 'Boleta exenta',
  46: 'Factura de compra',
  52: 'Guía de despacho',
  56: 'Nota de débito',
  61: 'Nota de crédito',
};

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
    SII_PKCS12_INVALID_OR_PASSWORD: 'El archivo PFX/P12 no es válido o su contraseña no corresponde.',
    SII_PKCS12_PRIVATE_KEY_MISSING: 'El PFX/P12 no contiene una llave privada utilizable.',
    SII_PKCS12_CERTIFICATE_MISSING: 'El PFX/P12 no contiene un certificado X.509 utilizable.',
    SII_PKCS12_UNSUPPORTED_ALGORITHM: 'El PFX/P12 usa un algoritmo que este entorno no puede importar.',
    SII_PKCS12_ENGINE_UNAVAILABLE: 'El motor seguro para importar PFX/P12 no está disponible.',
    SII_PKCS12_ENGINE_TIMEOUT: 'La importación del PFX/P12 excedió el tiempo permitido.',
    SII_PKCS12_OUTPUT_TOO_LARGE: 'El contenido del PFX/P12 excede los límites permitidos.',
    SII_CAF_CONFIGURATION_REQUIRED: 'Primero configura el RUT y certificado SII de la empresa.',
    SII_CAF_INVALID_XML: 'El archivo no corresponde a una autorización CAF válida del SII.',
    SII_CAF_REQUIRED_FIELDS_MISSING: 'El CAF está incompleto o no contiene todos los campos requeridos.',
    SII_CAF_VERSION_UNSUPPORTED: 'La versión del CAF no es compatible.',
    SII_CAF_SIGNATURE_ALGORITHM_UNSUPPORTED: 'El algoritmo de firma del CAF no es compatible.',
    SII_CAF_AUTHORIZATION_DATE_INVALID: 'La fecha de autorización del CAF no es válida.',
    SII_CAF_COMPANY_RUT_MISMATCH: 'El CAF pertenece a un RUT distinto del configurado en Motil.',
    SII_CAF_DOCUMENT_TYPE_INVALID: 'El tipo de DTE del CAF no es válido.',
    SII_CAF_RANGE_INVALID: 'El rango de folios del CAF no es válido.',
    SII_CAF_KEY_ID_INVALID: 'El identificador de llave del CAF no es válido.',
    SII_CAF_PRIVATE_KEY_INVALID: 'La llave privada incluida en el CAF no es válida.',
    SII_CAF_PRIVATE_KEY_NOT_RSA: 'La llave privada incluida en el CAF no es RSA.',
    SII_CAF_PUBLIC_KEY_INVALID: 'La llave pública declarada en el CAF no es válida.',
    SII_CAF_PRIVATE_PUBLIC_KEY_MISMATCH: 'La llave privada del CAF no corresponde a la llave pública autorizada por el SII.',
    SII_CAF_RANGE_OVERLAP: 'Este rango se superpone con otro CAF ya registrado para el mismo tipo de DTE.',
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
  const [cafs, setCafs] = useState<SiiCaf[]>([]);
  const [companyRut, setCompanyRut] = useState('');
  const [uploadMode, setUploadMode] = useState<UploadMode>('pkcs12');
  const [pkcs12, setPkcs12] = useState<File | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [privateKey, setPrivateKey] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [cafFile, setCafFile] = useState<File | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [savingCertificate, setSavingCertificate] = useState(false);
  const [testingAuth, setTestingAuth] = useState(false);
  const [savingCaf, setSavingCaf] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function loadConfig() {
    const response = await fetch('/api/sii/config', { cache: 'no-store' });
    const data = (await response.json()) as SiiConfig & { error?: string };
    if (!response.ok) throw new Error(data.error || 'SII_CONFIG_READ_FAILED');
    setConfig(data);
    if (data.companyRut) setCompanyRut(data.companyRut);
  }

  async function loadCafs() {
    const response = await fetch('/api/sii/cafs', { cache: 'no-store' });
    const data = (await response.json()) as { cafs?: SiiCaf[]; error?: string };
    if (!response.ok) throw new Error(data.error || 'SII_CAF_LIST_FAILED');
    setCafs(data.cafs || []);
  }

  useEffect(() => {
    void Promise.all([loadConfig(), loadCafs()]).catch((error) => {
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
    if (uploadMode === 'pkcs12' && !pkcs12) {
      setMessage({ ok: false, text: 'Selecciona el archivo .pfx o .p12 del firmante.' });
      return;
    }
    if (uploadMode === 'pem' && (!certificate || !privateKey)) {
      setMessage({ ok: false, text: 'Selecciona el certificado PEM y su llave privada.' });
      return;
    }

    setSavingCertificate(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set('companyRut', companyRut);
      form.set('passphrase', passphrase);
      if (uploadMode === 'pkcs12' && pkcs12) form.set('pkcs12', pkcs12);
      else if (certificate && privateKey) {
        form.set('certificate', certificate);
        form.set('privateKey', privateKey);
      }

      const response = await fetch('/api/sii/config', { method: 'POST', body: form });
      const data = (await response.json()) as SiiConfig & { error?: string };
      if (!response.ok) throw new Error(data.error || 'SII_CERTIFICATE_CONFIGURATION_FAILED');

      setConfig(data);
      setPkcs12(null);
      setCertificate(null);
      setPrivateKey(null);
      setPassphrase('');
      setMessage({ ok: true, text: 'Certificado validado y guardado cifrado en Supabase Vault.' });
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

  async function saveCaf() {
    if (!cafFile) {
      setMessage({ ok: false, text: 'Selecciona el XML de autorización de folios descargado desde el SII.' });
      return;
    }
    setSavingCaf(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set('caf', cafFile);
      const response = await fetch('/api/sii/cafs', { method: 'POST', body: form });
      const data = (await response.json()) as SiiCaf & { error?: string };
      if (!response.ok) throw new Error(data.error || 'SII_CAF_VALIDATION_FAILED');
      setCafFile(null);
      setMessage({
        ok: true,
        text: `CAF DTE ${data.documentType} validado: folios ${data.rangeStart}–${data.rangeEnd}. La llave privada quedó cifrada en el vault.`,
      });
      await loadCafs();
    } catch (error) {
      setMessage({ ok: false, text: readableError(error instanceof Error ? error.message : undefined) });
    } finally {
      setSavingCaf(false);
    }
  }

  const connected = health?.siiReachable === true && health?.seedReceived === true;
  const certificateOk = config?.configured === true && Boolean(config.certificateValidTo) && Date.parse(config.certificateValidTo || '') > Date.now();
  const authenticated = health?.authenticated === true || config?.lastAuthOk === true;
  const certificateReadyToSave = uploadMode === 'pkcs12' ? Boolean(pkcs12) : Boolean(certificate && privateKey);
  const totalAvailableFolios = useMemo(() => cafs.reduce((sum, caf) => sum + caf.availableFolios, 0), [cafs]);
  const hasActiveCaf = cafs.some((caf) => caf.status === 'active' && caf.availableFolios > 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Administración · Integraciones</p>
        <h1 className="text-3xl font-semibold tracking-tight">Servicio de Impuestos Internos</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Configuración técnica para autenticación SII, certificados digitales y folios electrónicos. Los secretos se procesan sólo en servidor y se almacenan cifrados.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Status label="Ambiente" value="CERTIFICACIÓN" ok />
          <Status label="Conectividad" value={connected ? 'SII disponible' : health ? 'Sin conexión' : 'Sin probar'} ok={health ? connected : undefined} />
          <Status label="Certificado" value={certificateOk ? 'Vigente' : config?.configured ? 'Revisar vigencia' : 'No configurado'} ok={config ? certificateOk : undefined} />
          <Status label="Autenticación" value={authenticated ? 'Token obtenido' : config?.lastAuthOk === false ? 'Última prueba falló' : 'Pendiente'} ok={config?.lastAuthOk === false ? false : authenticated ? true : undefined} />
          <Status label="Folios" value={hasActiveCaf ? `${totalAvailableFolios} disponibles` : cafs.length ? 'Sin folios activos' : 'Sin CAF'} ok={cafs.length ? hasActiveCaf : undefined} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={testConnection} disabled={loadingHealth} className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
            {loadingHealth ? 'Probando conexión…' : '1. Probar conexión'}
          </button>
          <button type="button" onClick={testAuthentication} disabled={testingAuth || !certificateOk} className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
            {testingAuth ? 'Firmando y autenticando…' : '3. Probar autenticación SII'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">2. Certificado digital del firmante</p>
          <p className="text-sm text-muted-foreground">El archivo se procesa sólo en el servidor. Motil valida titular, vigencia y llave privada, normaliza el material de firma y lo guarda cifrado en Supabase Vault.</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">RUT empresa</span>
            <input value={companyRut} onChange={(event) => setCompanyRut(event.target.value)} placeholder="76.123.456-7" className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring" />
          </label>

          <button type="button" onClick={() => { setUploadMode('pkcs12'); setCertificate(null); setPrivateKey(null); setPassphrase(''); }} className={`rounded-lg border p-4 text-left ${uploadMode === 'pkcs12' ? 'border-foreground bg-muted/40' : 'bg-background'}`}>
            <span className="text-sm font-semibold">PFX / P12 · recomendado</span>
            <span className="mt-1 block text-xs text-muted-foreground">Formato habitual de certificados digitales en Chile; no necesitas convertirlo a PEM.</span>
          </button>
          <button type="button" onClick={() => { setUploadMode('pem'); setPkcs12(null); setPassphrase(''); }} className={`rounded-lg border p-4 text-left ${uploadMode === 'pem' ? 'border-foreground bg-muted/40' : 'bg-background'}`}>
            <span className="text-sm font-semibold">PEM · avanzado</span>
            <span className="mt-1 block text-xs text-muted-foreground">Para TI: certificado público y llave privada separados.</span>
          </button>

          {uploadMode === 'pkcs12' ? (
            <>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">Archivo de certificado digital</span>
                <input type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={(event) => setPkcs12(event.target.files?.[0] || null)} className="block w-full rounded-md border bg-background p-2 text-sm" />
              </label>
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">Contraseña del certificado</span>
                <input type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="Contraseña del archivo PFX/P12" className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring" />
                <span className="block text-xs text-muted-foreground">Se usa sólo durante la importación y no se conserva.</span>
              </label>
            </>
          ) : (
            <>
              <label className="space-y-2 text-sm"><span className="font-medium">Certificado público</span><input type="file" accept=".pem,.crt,.cer,text/plain,application/x-pem-file" onChange={(event) => setCertificate(event.target.files?.[0] || null)} className="block w-full rounded-md border bg-background p-2 text-sm" /></label>
              <label className="space-y-2 text-sm"><span className="font-medium">Llave privada</span><input type="file" accept=".pem,.key,text/plain,application/x-pem-file" onChange={(event) => setPrivateKey(event.target.files?.[0] || null)} className="block w-full rounded-md border bg-background p-2 text-sm" /></label>
              <label className="space-y-2 text-sm md:col-span-2"><span className="font-medium">Contraseña de la llave privada</span><input type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="Sólo si la llave PEM está cifrada" className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring" /></label>
            </>
          )}
        </div>

        <button type="button" onClick={saveCertificate} disabled={savingCertificate || !companyRut || !certificateReadyToSave} className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
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

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">4. CAF y rangos de folios</p>
          <p className="text-sm text-muted-foreground">
            Carga el XML de autorización descargado desde el SII. Motil valida RUT, tipo DTE, rango y que la llave privada corresponda a la llave pública del CAF. El XML completo se guarda cifrado y los folios se reservan atómicamente para impedir duplicados.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-2 text-sm">
            <span className="font-medium">Archivo CAF del SII</span>
            <input type="file" accept=".xml,text/xml,application/xml" onChange={(event) => setCafFile(event.target.files?.[0] || null)} className="block w-full rounded-md border bg-background p-2 text-sm" />
          </label>
          <button type="button" onClick={saveCaf} disabled={savingCaf || !cafFile || !config?.companyRut} className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
            {savingCaf ? 'Validando CAF…' : 'Guardar CAF seguro'}
          </button>
        </div>

        {!config?.companyRut && <p className="mt-3 text-xs text-muted-foreground">Configura primero el RUT de la empresa para validar que el CAF pertenezca al mismo contribuyente.</p>}

        <div className="mt-5 space-y-3">
          {cafs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Todavía no hay CAF cargados para esta empresa.</div>
          ) : cafs.map((caf) => (
            <div key={caf.id} className="grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-6">
              <Detail label="DTE" value={`${caf.documentType} · ${DTE_LABELS[caf.documentType] || 'Documento electrónico'}`} />
              <Detail label="Rango" value={`${caf.rangeStart}–${caf.rangeEnd}`} />
              <Detail label="Próximo folio" value={caf.availableFolios > 0 ? String(caf.nextFolio) : 'Agotado'} />
              <Detail label="Disponibles" value={String(caf.availableFolios)} />
              <Detail label="Autorizado" value={new Date(`${caf.authorizationDate}T00:00:00`).toLocaleDateString('es-CL')} />
              <Detail label="Estado" value={caf.status === 'active' ? 'Activo' : caf.status === 'exhausted' ? 'Agotado' : 'Deshabilitado'} />
              <div className="md:col-span-6 border-t pt-3"><Detail label="Huella CAF SHA-256" value={caf.fingerprintSha256} mono /></div>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <div className={`rounded-lg border p-4 text-sm ${message.ok ? 'bg-muted/40' : 'bg-destructive/5'}`}>
          <p className="font-semibold">{message.ok ? 'Operación completada' : 'No se pudo completar'}</p>
          <p className="mt-1 text-muted-foreground">{message.text}</p>
        </div>
      )}

      <section className="rounded-xl border p-5 text-sm">
        <p className="font-semibold">Siguiente bloque</p>
        <p className="mt-1 text-muted-foreground">DTE 33 → reserva idempotente de folio → TED → firma XML → envío SII → TrackID → consulta de aceptación/rechazo.</p>
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
