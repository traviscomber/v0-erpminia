'use client';

import { useCallback, useEffect, useState } from 'react';

type DemoStep = {
  key: string;
  label: string;
  status: 'ok' | 'accepted' | 'rejected';
  simulated: true;
  network?: false;
};

type DemoRun = {
  id: string;
  scenario: 'accepted' | 'rejected';
  companyRut: string;
  receiverRut: string;
  documentType: 33;
  folio: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  trackId: string;
  status: 'accepted' | 'rejected';
  statusCode: string;
  statusMessage: string;
  payloadHash: string;
  steps: DemoStep[];
  createdAt: string;
  simulated: true;
  siiNetworkCalled: false;
};

function money(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

export default function SiiDemoPage() {
  const [runs, setRuns] = useState<DemoRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<'accepted' | 'rejected' | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    const response = await fetch('/api/sii/demo', { cache: 'no-store' });
    const data = (await response.json()) as { runs?: DemoRun[]; error?: string };
    if (!response.ok) throw new Error(data.error || 'SII_DEMO_LIST_FAILED');
    setRuns(data.runs || []);
  }, []);

  useEffect(() => {
    void loadRuns()
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No se pudo cargar el demo.'))
      .finally(() => setLoading(false));
  }, [loadRuns]);

  async function runScenario(scenario: 'accepted' | 'rejected') {
    setRunning(scenario);
    setError(null);
    try {
      const response = await fetch('/api/sii/demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      const data = (await response.json()) as DemoRun & { error?: string };
      if (!response.ok) throw new Error(data.error || 'SII_DEMO_CREATE_FAILED');
      setRuns((current) => [data, ...current].slice(0, 20));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo ejecutar el demo.');
    } finally {
      setRunning(null);
    }
  }

  async function clearRuns() {
    setClearing(true);
    setError(null);
    try {
      const response = await fetch('/api/sii/demo', { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'SII_DEMO_CLEAR_FAILED');
      setRuns([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo limpiar el demo.');
    } finally {
      setClearing(false);
    }
  }

  const latest = runs[0] || null;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="text-xs font-semibold uppercase tracking-widest">Modo demo aislado</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Probar flujo SII sin tocar el SII</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6">
          Este entorno no llama a Maullín ni Palena, no usa certificados o CAF reales y no reserva folios fiscales. Todo se guarda sólo en el ledger <span className="font-mono">sii_demo_runs</span> y puede limpiarse desde esta pantalla.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Escenarios de prueba</h2>
            <p className="mt-1 text-sm text-muted-foreground">Recorre certificado → CAF → folio → DTE 33 → TED → firma → envío → TrackID → respuesta.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => runScenario('accepted')} disabled={running !== null} className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {running === 'accepted' ? 'Ejecutando…' : 'Probar aceptación'}
            </button>
            <button type="button" onClick={() => runScenario('rejected')} disabled={running !== null} className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium disabled:opacity-50">
              {running === 'rejected' ? 'Ejecutando…' : 'Probar rechazo'}
            </button>
            <button type="button" onClick={clearRuns} disabled={clearing || runs.length === 0} className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium disabled:opacity-50">
              {clearing ? 'Limpiando…' : 'Limpiar demo'}
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      </section>

      {latest ? (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Última ejecución</p>
              <h2 className="mt-1 text-xl font-semibold">DTE 33 demo · folio {latest.folio}</h2>
              <p className="mt-1 text-sm text-muted-foreground">TrackID {latest.trackId} · código {latest.statusCode}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${latest.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'}`}>
              {latest.status === 'accepted' ? 'ACEPTADO DEMO' : 'RECHAZADO DEMO'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Emisor demo" value={latest.companyRut} />
            <Metric label="Receptor demo" value={latest.receiverRut} />
            <Metric label="Neto" value={money(latest.netAmount)} />
            <Metric label="IVA 19%" value={money(latest.taxAmount)} />
            <Metric label="Total" value={money(latest.totalAmount)} />
            <Metric label="Red SII" value="NO CONTACTADA" />
            <Metric label="Folio fiscal real" value="NO CONSUMIDO" />
            <Metric label="Hash demo" value={latest.payloadHash.slice(0, 12)} mono />
          </div>

          <div className="mt-6 grid gap-2">
            {latest.steps.map((step, index) => (
              <div key={`${latest.id}-${step.key}`} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
                <span className="flex-1 font-medium">{step.label}</span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">simulado</span>
              </div>
            ))}
          </div>

          <p className="mt-5 rounded-lg bg-muted/40 p-4 text-sm">{latest.statusMessage}</p>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {loading ? 'Cargando ejecuciones demo…' : 'Todavía no hay ejecuciones. Usa “Probar aceptación” para recorrer el flujo completo.'}
        </section>
      )}

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Historial demo</h2>
        <div className="mt-4 space-y-2">
          {runs.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos demo.</p> : runs.map((run) => (
            <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <div>
                <span className="font-medium">Folio {run.folio}</span>
                <span className="ml-2 text-muted-foreground">{run.trackId}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{money(run.totalAmount)}</span>
                <span className={run.status === 'accepted' ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'font-medium text-red-700 dark:text-red-300'}>
                  {run.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 break-all text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
