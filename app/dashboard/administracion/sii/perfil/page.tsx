'use client';

import { useEffect, useState } from 'react';

type IssuerProfile = {
  configured: boolean;
  environment?: string;
  companyRut?: string | null;
  signerRut?: string | null;
  legalName?: string | null;
  giro?: string | null;
  acteco?: string | null;
  address?: string | null;
  commune?: string | null;
  city?: string | null;
  resolutionDate?: string | null;
  resolutionNumber?: number | null;
  updatedAt?: string | null;
};

type SiiConfig = {
  configured: boolean;
  environment?: string;
  companyRut?: string | null;
};

const EMPTY_PROFILE: IssuerProfile = {
  configured: false,
  signerRut: '',
  legalName: '',
  giro: '',
  acteco: '',
  address: '',
  commune: '',
  city: '',
  resolutionDate: '',
  resolutionNumber: null,
};

function readableError(code?: string) {
  if (!code) return 'No se pudo completar la operación.';
  if (code === 'SII_CERTIFICATE_NOT_CONFIGURED') return 'Primero carga el RUT de la empresa y su certificado digital.';
  if (code === 'SII_ISSUER_PROFILE_INVALID') return 'Revisa los datos tributarios ingresados.';
  if (code === 'SII_COMPANY_RUT_INVALID') return 'El RUT del firmante no es válido.';
  return code;
}

export default function SiiIssuerProfilePage() {
  const [profile, setProfile] = useState<IssuerProfile>(EMPTY_PROFILE);
  const [companyRut, setCompanyRut] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const [issuerResponse, configResponse] = await Promise.all([
      fetch('/api/sii/issuer', { cache: 'no-store' }),
      fetch('/api/sii/config', { cache: 'no-store' }),
    ]);
    const issuer = (await issuerResponse.json()) as IssuerProfile & { error?: string };
    const config = (await configResponse.json()) as SiiConfig & { error?: string };
    if (!issuerResponse.ok) throw new Error(issuer.error || 'SII_ISSUER_PROFILE_READ_FAILED');
    if (!configResponse.ok) throw new Error(config.error || 'SII_CONFIG_READ_FAILED');

    setCompanyRut(config.companyRut || issuer.companyRut || null);
    setProfile({ ...EMPTY_PROFILE, ...issuer });
  }

  useEffect(() => {
    void load()
      .catch((error) => setMessage({ ok: false, text: readableError(error instanceof Error ? error.message : undefined) }))
      .finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof IssuerProfile>(key: K, value: IssuerProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/sii/issuer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerRut: profile.signerRut,
          legalName: profile.legalName,
          giro: profile.giro,
          acteco: profile.acteco,
          address: profile.address,
          commune: profile.commune,
          city: profile.city || null,
          resolutionDate: profile.resolutionDate,
          resolutionNumber: profile.resolutionNumber,
        }),
      });
      const data = (await response.json()) as IssuerProfile & { error?: string };
      if (!response.ok) throw new Error(data.error || 'SII_ISSUER_PROFILE_SAVE_FAILED');
      setProfile((current) => ({ ...current, ...data, configured: true }));
      setMessage({ ok: true, text: 'Perfil tributario guardado. No se emitió ningún DTE.' });
    } catch (error) {
      setMessage({ ok: false, text: readableError(error instanceof Error ? error.message : undefined) });
    } finally {
      setSaving(false);
    }
  }

  const formReady = Boolean(
    companyRut && profile.signerRut && profile.legalName && profile.giro && profile.acteco &&
    profile.address && profile.commune && profile.resolutionDate && profile.resolutionNumber != null,
  );

  if (loading) {
    return <main className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Cargando perfil tributario…</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Administración · SII</p>
        <h1 className="text-3xl font-semibold tracking-tight">Perfil tributario del emisor</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Estos datos alimentan el encabezado del DTE 33. Guardarlos no reserva folios, no firma documentos y no envía información al SII.
        </p>
      </div>

      {!companyRut ? (
        <section className="rounded-xl border border-dashed p-6 text-sm">
          <p className="font-semibold">Falta la identidad tributaria base</p>
          <p className="mt-1 text-muted-foreground">Carga primero el RUT de la empresa y el certificado digital en “Conexión y certificados”.</p>
        </section>
      ) : (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="RUT empresa" value={companyRut} disabled />
            <Field label="RUT firmante" value={profile.signerRut || ''} onChange={(value) => setField('signerRut', value)} placeholder="12.345.678-5" help="Titular del certificado usado como RutEnvia/rutSender. Puede ser distinto del RUT empresa." />
            <Field label="Razón social" value={profile.legalName || ''} onChange={(value) => setField('legalName', value)} maxLength={100} />
            <Field label="Giro" value={profile.giro || ''} onChange={(value) => setField('giro', value)} maxLength={80} />
            <Field label="ACTECO" value={profile.acteco || ''} onChange={(value) => setField('acteco', value.replace(/\D/g, '').slice(0, 6))} placeholder="620200" />
            <Field label="Dirección" value={profile.address || ''} onChange={(value) => setField('address', value)} maxLength={60} />
            <Field label="Comuna" value={profile.commune || ''} onChange={(value) => setField('commune', value)} maxLength={20} />
            <Field label="Ciudad" value={profile.city || ''} onChange={(value) => setField('city', value)} maxLength={20} optional />
            <Field label="Fecha resolución SII" type="date" value={profile.resolutionDate || ''} onChange={(value) => setField('resolutionDate', value)} />
            <Field label="N° resolución SII" type="number" value={profile.resolutionNumber == null ? '' : String(profile.resolutionNumber)} onChange={(value) => setField('resolutionNumber', value === '' ? null : Number(value))} min="0" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={saving || !formReady} className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar perfil tributario'}
            </button>
            {profile.configured ? <span className="text-sm text-muted-foreground">Perfil configurado.</span> : <span className="text-sm text-muted-foreground">Pendiente de datos reales.</span>}
          </div>
        </section>
      )}

      {message ? (
        <div className={`rounded-xl border p-4 text-sm ${message.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <p className="font-semibold">{message.ok ? 'Listo' : 'No se pudo guardar'}</p>
          <p className="mt-1 text-muted-foreground">{message.text}</p>
        </div>
      ) : null}

      <section className="rounded-xl border p-5 text-sm">
        <p className="font-semibold">Dato que puede quedar pendiente</p>
        <p className="mt-1 text-muted-foreground">
          Si todavía no tienes al firmante/usuario autorizado, no inventes un RUT. La plataforma puede quedar desplegada y el perfil se completa cuando tengas ese dato real.
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  help,
  disabled = false,
  optional = false,
  maxLength,
  min,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'date' | 'number';
  placeholder?: string;
  help?: string;
  disabled?: boolean;
  optional?: boolean;
  maxLength?: number;
  min?: string;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}{optional ? ' · opcional' : ''}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      />
      {help ? <span className="block text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}
