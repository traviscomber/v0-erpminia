'use client';

import { useState } from 'react';

type SiiHealth = {
  environment?: string;
  siiReachable?: boolean;
  seedReceived?: boolean;
  authenticated?: boolean;
  upstreamStatus?: number;
  latencyMs?: number;
  checkedAt?: string;
  error?: string;
};

export default function SiiConnectivityPage() {
  const [result, setResult] = useState<SiiHealth | null>(null);
  const [loading, setLoading] = useState(false);

  async function testConnection() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/sii/health', { cache: 'no-store' });
      const data = (await response.json()) as SiiHealth;
      setResult(data);
    } catch {
      setResult({ siiReachable: false, seedReceived: false, error: 'CLIENT_CONNECTION_FAILED' });
    } finally {
      setLoading(false);
    }
  }

  const connected = result?.siiReachable === true && result?.seedReceived === true;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Administración · Integraciones</p>
        <h1 className="text-3xl font-semibold tracking-tight">Servicio de Impuestos Internos</h1>
        <p className="mt-2 text-muted-foreground">
          Prueba segura de conectividad con el ambiente de certificación del SII. Esta prueba solicita una semilla; no emite DTE, no usa CAF y no consume folios.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Status label="Ambiente" value="CERTIFICACIÓN" ok />
          <Status label="Conectividad" value={result ? (result.siiReachable ? 'SII disponible' : 'Sin conexión') : 'Sin probar'} ok={result?.siiReachable} />
          <Status label="Semilla" value={result ? (result.seedReceived ? 'Recibida' : 'No recibida') : 'Pendiente'} ok={result?.seedReceived} />
          <Status label="Autenticación" value="Pendiente de certificado" />
        </div>

        <button
          type="button"
          onClick={testConnection}
          disabled={loading}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Probando conexión…' : 'Probar conexión SII'}
        </button>

        {result && (
          <div className={`mt-5 rounded-lg border p-4 text-sm ${connected ? 'bg-muted/40' : 'bg-destructive/5'}`}>
            <p className="font-semibold">{connected ? 'Conexión SII OK' : 'La prueba no se completó'}</p>
            <p className="mt-1 text-muted-foreground">
              {connected
                ? `Maullín respondió y entregó una semilla${typeof result.latencyMs === 'number' ? ` en ${result.latencyMs} ms` : ''}.`
                : `No se recibió una semilla válida${result.error ? ` (${result.error})` : ''}.`}
            </p>
          </div>
        )}
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
