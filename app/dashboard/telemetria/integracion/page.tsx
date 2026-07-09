'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Download, RadioTower, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type ConnectionCheck = {
  ok: boolean;
  status?: 'ok' | 'degraded' | 'error';
  configured?: boolean;
  endpoint?: string;
  ingest_endpoint?: string;
  required_header?: string;
  accepted_payload?: string[];
  error?: string;
  message?: string;
};

type IngestCheck = {
  success?: boolean;
  dry_run?: boolean;
  batch?: boolean;
  ingested_count?: number;
  validated_count?: number;
  alarm_count?: number;
  equipment_id?: string | null;
  equipment_name?: string | null;
  status?: string;
  timestamp?: string;
  validated?: Array<{
    index: number;
    equipment_id: string;
    equipment_name: string;
    status: string;
    timestamp: string;
  }>;
  errors?: string[];
  error?: string;
};

const SAMPLE_PAYLOAD = {
  readings: [
    {
      equipment_code: 'EQ-001',
      temperature: 72.4,
      pressure: 81.2,
      vibration: 1.8,
      rpm: 1480,
      status: 'normal',
      source_machine: 'patagua-gateway-01',
    },
    {
      equipment_code: 'EQ-002',
      temperature: 84.1,
      pressure: 93.6,
      vibration: 3.2,
      rpm: 1605,
      status: 'alert',
      source_machine: 'patagua-gateway-01',
      message: 'Temperatura y vibracion fuera de rango',
    },
  ],
};

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function TelemetriaIntegracionPage() {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<ConnectionCheck | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState(process.env.NEXT_PUBLIC_TELEMETRY_GATEWAY_URL || '');
  const [telemetryToken, setTelemetryToken] = useState('TU_TOKEN');
  const [currentOrigin, setCurrentOrigin] = useState('');
  const [samplePayload, setSamplePayload] = useState(() => formatJson(SAMPLE_PAYLOAD));
  const [sampleRunning, setSampleRunning] = useState<'validate' | 'send' | null>(null);
  const [sampleResult, setSampleResult] = useState<IngestCheck | null>(null);

  useEffect(() => {
    const savedGateway = window.localStorage.getItem('telemetry-gateway-url');
    if (savedGateway) {
      setGatewayUrl(savedGateway);
      return;
    }

    if (!gatewayUrl) {
      setGatewayUrl(window.location.origin);
    }

    setCurrentOrigin(window.location.origin);
  }, [gatewayUrl]);

  useEffect(() => {
    if (!gatewayUrl) return;
    window.localStorage.setItem('telemetry-gateway-url', gatewayUrl);
  }, [gatewayUrl]);

  const normalizedGatewayUrl = gatewayUrl.trim().replace(/\/+$/, '');
  const ingestUrl = `${normalizedGatewayUrl || ''}/api/telemetry/ingest`;
  const healthUrl = `${normalizedGatewayUrl || ''}/api/telemetry/health`;
  const quickHosts = [
    { label: 'Este host', value: currentOrigin },
    { label: 'Localhost', value: 'http://localhost:3000' },
    { label: 'LAN de ejemplo', value: 'http://192.168.1.20:3000' },
  ].filter((item) => item.value);

  const code = `curl -X POST ${ingestUrl || 'https://TU-DOMINIO/api/telemetry/ingest'} \\
  -H "Content-Type: application/json" \\
  -H "x-telemetry-token: ${telemetryToken || 'TU_TOKEN'}" \\
  -d '${formatJson(SAMPLE_PAYLOAD)}'`;

  const downloadSpec = () => {
    const lines = [
      ['Campo', 'Requerido', 'Descripción'],
      ['equipment_id', 'No', 'ID interno del equipo o activo'],
      ['equipment_code', 'No', 'Código operativo del equipo'],
      ['temperature', 'No', 'Temperatura en grados'],
      ['pressure', 'No', 'Presion en PSI'],
      ['vibration', 'No', 'Vibracion en m/s2'],
      ['rpm', 'No', 'RPM del equipo'],
      ['status', 'Si', 'normal o alert'],
      ['source_machine', 'No', 'Nombre del gateway o máquina origen'],
      ['readings[]', 'No', 'Lote de lecturas para enviar varios equipos en una sola llamada'],
    ];
    const csv = lines.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'especificacion-telemetria-lan.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const testConnection = async () => {
    setChecking(true);
    setCheckResult(null);

    try {
      const response = await fetch(healthUrl || '/api/telemetry/health', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'x-telemetry-token': telemetryToken,
        },
      });
      const payload = (await response.json().catch(() => null)) as ConnectionCheck | null;

      setCheckResult({
        ok: response.ok,
        ...payload,
      });
    } catch (error) {
      setCheckResult({
        ok: false,
        error: error instanceof Error ? error.message : 'No se pudo conectar con el endpoint',
      });
    } finally {
      setChecking(false);
    }
  };

  const runSample = async (mode: 'validate' | 'send') => {
    setSampleRunning(mode);
    setSampleResult(null);

    try {
      const parsedPayload = JSON.parse(samplePayload) as Record<string, unknown>;
      const requestPayload =
        mode === 'validate'
          ? {
              ...parsedPayload,
              validate_only: true,
            }
          : parsedPayload;

      const response = await fetch(ingestUrl || '/api/telemetry/ingest', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'x-telemetry-token': telemetryToken,
        },
        body: JSON.stringify(requestPayload),
      });

      const payload = (await response.json().catch(() => null)) as IngestCheck | null;
      setSampleResult({
        success: response.ok,
        ...payload,
      });
    } catch (error) {
      setSampleResult({
        success: false,
        error: error instanceof Error ? error.message : 'No se pudo procesar la muestra',
      });
    } finally {
      setSampleRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integración LAN de telemetría</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Esta página define el contrato mínimo para conectar una segunda máquina de la red local de la Patagua.
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:min-w-[32rem]">
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={gatewayUrl}
              onChange={(event) => setGatewayUrl(event.target.value)}
              placeholder="https://patagua.local o http://192.168.1.20:3000"
              aria-label="URL del gateway"
            />
            <Input
              value={telemetryToken}
              onChange={(event) => setTelemetryToken(event.target.value)}
              placeholder="x-telemetry-token"
              aria-label="Token de telemetría"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {quickHosts.map((host) => (
              <Button key={host.label} type="button" variant="ghost" size="sm" onClick={() => setGatewayUrl(host.value)}>
                {host.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            La prueba usa el host ingresado. Si apuntas a otra máquina, ese endpoint debe permitir acceso desde la red local.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadSpec}>
            <Download className="mr-2 h-4 w-4" />
            Descargar especificación
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={checking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Probando...' : 'Probar conexión'}
          </Button>
          <Button asChild>
            <Link href="/dashboard/telemetria">
              <ArrowRight className="mr-2 h-4 w-4" />
               Volver a telemetría
            </Link>
          </Button>
        </div>
      </div>

      {checkResult && (
        <Card className={checkResult.ok ? 'border-green-300 bg-green-50/40' : 'border-amber-300 bg-amber-50/40'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {checkResult.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <RadioTower className="h-5 w-5 text-amber-600" />
              )}
              {checkResult.ok ? 'Conexión verificada' : 'Conexión con observaciones'}
            </CardTitle>
            <CardDescription>
              {checkResult.ok
                 ? 'El endpoint de salud responde y la ruta de telemetría está disponible.'
                : checkResult.error || 'El endpoint responde, pero requiere ajuste antes de enviar lecturas.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">Endpoint: {checkResult.endpoint || '/api/telemetry/health'}</Badge>
            <Badge variant="outline">Ingreso: {checkResult.ingest_endpoint || '/api/telemetry/ingest'}</Badge>
            <Badge variant="outline">Configurado: {checkResult.configured ? 'sí' : 'no'}</Badge>
            {Array.isArray(checkResult.accepted_payload) && (
              <Badge variant="outline">{checkResult.accepted_payload.length} campos aceptados</Badge>
            )}
            {checkResult.required_header ? <Badge variant="outline">Header: {checkResult.required_header}</Badge> : null}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTower className="h-5 w-5 text-[var(--brand-verde)]" />
              Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">POST {normalizedGatewayUrl || 'https://TU-DOMINIO'}/api/telemetry/ingest</div>
            <p className="text-sm text-muted-foreground">Acepta JSON desde un equipo de la red local o lotes de lecturas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-[var(--brand-verde)]" />
              Salud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">GET {normalizedGatewayUrl || 'https://TU-DOMINIO'}/api/telemetry/health</div>
            <p className="text-sm text-muted-foreground">Verifica conectividad y token sin registrar lecturas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-[var(--brand-verde)]" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">x-telemetry-token</div>
            <p className="text-sm text-muted-foreground">Se valida contra `TELEMETRY_INGEST_TOKEN` y se incluye en los ejemplos de prueba.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTower className="h-5 w-5 text-[var(--brand-verde)]" />
              Origen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">Gateway o PLC</div>
            <p className="text-sm text-muted-foreground">La otra máquina puede enviar una lectura o varias en un solo POST.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ejemplo de envío</CardTitle>
          <CardDescription>Este ejemplo sirve para pruebas desde una PC o equipo de la red local.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm leading-6">{code}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prueba directa de la lectura</CardTitle>
          <CardDescription>
            Valida primero sin escribir datos. Cuando la lectura quede correcta, puedes enviarla al endpoint real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={samplePayload}
            onChange={(event) => setSamplePayload(event.target.value)}
            className="min-h-[20rem] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
            spellCheck={false}
             aria-label="Payload JSON de telemetría"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setSamplePayload(formatJson(SAMPLE_PAYLOAD))}>
              Cargar lectura de ejemplo
            </Button>
            <Button type="button" variant="outline" onClick={() => runSample('validate')} disabled={sampleRunning !== null}>
              {sampleRunning === 'validate' ? 'Validando...' : 'Validar lectura'}
            </Button>
            <Button type="button" onClick={() => runSample('send')} disabled={sampleRunning !== null}>
              {sampleRunning === 'send' ? 'Enviando...' : 'Enviar lectura'}
            </Button>
          </div>
          {sampleResult && (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={sampleResult.success ? 'default' : 'destructive'}>
                  {sampleResult.success ? 'Procesado' : 'Con error'}
                </Badge>
                {sampleResult.dry_run ? <Badge variant="outline">Validación interna</Badge> : null}
                {typeof sampleResult.validated_count === 'number' ? (
                  <Badge variant="outline">Validadas: {sampleResult.validated_count}</Badge>
                ) : null}
                {typeof sampleResult.ingested_count === 'number' ? (
                  <Badge variant="outline">Insertadas: {sampleResult.ingested_count}</Badge>
                ) : null}
                {typeof sampleResult.alarm_count === 'number' ? (
                  <Badge variant="outline">Alarmas: {sampleResult.alarm_count}</Badge>
                ) : null}
              </div>
              {sampleResult.error ? <p className="text-sm text-destructive">{sampleResult.error}</p> : null}
              {Array.isArray(sampleResult.errors) && sampleResult.errors.length > 0 ? (
                <div className="space-y-1 text-sm text-amber-700">
                  {sampleResult.errors.map((item, index) => (
                    <div key={`${item}-${index}`}>{item}</div>
                  ))}
                </div>
              ) : null}
              <pre className="overflow-x-auto rounded-lg border bg-background p-4 text-xs leading-6">
                {formatJson(sampleResult)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checklist de puesta en marcha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>1. Configurar `TELEMETRY_INGEST_TOKEN` en el entorno del sistema.</div>
            <div>2. Asegurar que la otra máquina resuelva la URL del sistema en la red local.</div>
            <div>3. Enviar `equipment_id` o `equipment_code` para identificar el destino, o `readings` para lotes.</div>
            <div>4. Probar una lectura normal y una de alerta.</div>
            <div>5. Verificar que la lectura aparezca en telemetría y, si corresponde, que cree alarma.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campos esperados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-lg border p-3">equipment_id, equipment_code, asset_code, equipment_name</div>
            <div className="rounded-lg border p-3">temperature, pressure, vibration, rpm</div>
            <div className="rounded-lg border p-3">status, severity, message, description</div>
            <div className="rounded-lg border p-3">readings[] para enviar varios equipos en una sola llamada</div>
            <div className="rounded-lg border p-3">source_machine, timestamp</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
