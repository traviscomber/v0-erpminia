import Link from 'next/link';
import { ArrowRight, CheckCircle2, Download, RadioTower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TelemetriaIntegracionPage() {
  const code = `curl -X POST https://TU-DOMINIO/api/telemetry/ingest \\
  -H "Content-Type: application/json" \\
  -H "x-telemetry-token: TU_TOKEN" \\
  -d '{
    "equipment_code": "EQ-001",
    "temperature": 72.4,
    "pressure": 81.2,
    "vibration": 1.8,
    "rpm": 1480,
    "status": "normal",
    "source_machine": "patagua-gateway-01"
  }'`;

  const downloadSpec = () => {
    const lines = [
      ['Campo', 'Requerido', 'Descripcion'],
      ['equipment_id', 'No', 'ID interno del equipo o activo'],
      ['equipment_code', 'No', 'Codigo operativo del equipo'],
      ['temperature', 'No', 'Temperatura en grados'],
      ['pressure', 'No', 'Presion en PSI'],
      ['vibration', 'No', 'Vibracion en m/s2'],
      ['rpm', 'No', 'RPM del equipo'],
      ['status', 'Si', 'normal o alert'],
      ['source_machine', 'No', 'Nombre del gateway o maquina origen'],
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integracion LAN de telemetria</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Esta pagina define el contrato minimo para conectar una segunda maquina de la red local de la Patagua.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadSpec}>
            <Download className="mr-2 h-4 w-4" />
            Descargar especificacion
          </Button>
          <Button asChild>
            <Link href="/dashboard/telemetria">
              <ArrowRight className="mr-2 h-4 w-4" />
              Volver a telemetria
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTower className="h-5 w-5 text-[var(--brand-verde)]" />
              Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">POST /api/telemetry/ingest</div>
            <p className="text-sm text-muted-foreground">Acepta JSON desde un gateway local.</p>
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
            <p className="text-sm text-muted-foreground">Se valida contra `TELEMETRY_INGEST_TOKEN`.</p>
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
            <p className="text-sm text-muted-foreground">La otra maquina solo empuja lecturas y eventos.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ejemplo de envio</CardTitle>
          <CardDescription>Este ejemplo sirve para pruebas desde una PC o gateway de la red local.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm leading-6">{code}</pre>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checklist de puesta en marcha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>1. Configurar `TELEMETRY_INGEST_TOKEN` en el entorno del sistema.</div>
            <div>2. Asegurar que la otra maquina resuelva la URL del sistema en la red local.</div>
            <div>3. Enviar `equipment_id` o `equipment_code` para identificar el destino.</div>
            <div>4. Probar una lectura normal y una de alerta.</div>
            <div>5. Verificar que la lectura aparezca en telemetria y, si corresponde, que cree alarma.</div>
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
            <div className="rounded-lg border p-3">source_machine, timestamp</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}