'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type Task = {
  task_key: string;
  title: string;
  evidence_summary: string | null;
  status: string | null;
  severity: 'critical' | 'warning' | 'info';
  responsibility: 'owner' | 'support' | 'escalation';
  role_action: string | null;
  due_at: string | null;
  urgency_label: string | null;
  responsibility_label: string | null;
};

type Payload = {
  task: Task;
  shipment: Record<string, unknown>;
  source: string;
  authorizationBoundary: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el despacho.');
  return payload;
};

const show = (value: unknown) => value === null || value === undefined || value === '' ? '—' : String(value);

const formatDate = (value: unknown) => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date);
};

export default function ShipmentReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, error, isLoading, mutate } = useSWR<Payload>(
    id ? `/api/actions/shipment-review/${encodeURIComponent(id)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) return <StatePanel tone="loading" title="Cargando despacho" className="min-h-64" />;
  if (error) return <StatePanel tone="error" title="No fue posible abrir esta revisión" description={error.message} actions={<><Button asChild variant="outline"><Link href="/dashboard/acciones">Volver a Mis acciones</Link></Button><Button variant="outline" onClick={() => void mutate()}>Reintentar</Button></>} className="min-h-64" />;
  if (!data) return <StatePanel title="Revisión no disponible" actions={<Button asChild variant="outline"><Link href="/dashboard/acciones">Volver a Mis acciones</Link></Button>} className="min-h-64" />;

  const shipment = data.shipment;
  const payload = (shipment.source_payload && typeof shipment.source_payload === 'object' ? shipment.source_payload : {}) as Record<string, unknown>;
  const fields: Array<[string, unknown]> = [
    ['Despacho', shipment.shipment_number],
    ['Fecha', formatDate(shipment.shipment_date)],
    ['Lote', payload.lot],
    ['Turno', payload.shift],
    ['Cantidad cruda', `${show(shipment.raw_quantity)} ${show(shipment.raw_unit)}`],
    ['Toneladas normalizadas', shipment.normalized_metric_tons],
    ['Humedad despacho', payload.dispatch_humidity_pct === null || payload.dispatch_humidity_pct === undefined ? '—' : `${payload.dispatch_humidity_pct}%`],
    ['Ley despacho', payload.dispatch_grade_pct === null || payload.dispatch_grade_pct === undefined ? '—' : `${payload.dispatch_grade_pct}%`],
    ['Fino fuente', payload.real_fine_source_t],
    ['Estado validación', shipment.validation_status],
    ['Estado normalización', shipment.normalization_status],
    ['Archivo fuente', shipment.source_file],
    ['Hoja', shipment.source_sheet],
    ['Fila', shipment.source_row],
  ];

  return <div className="mx-auto max-w-6xl space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Producción · Revisión de despacho</PageHeaderEyebrow>
        <PageHeaderTitle>{data.task.title}</PageHeaderTitle>
        <PageHeaderDescription>{data.task.evidence_summary || 'Despacho de concentrado que requiere revisión antes del cierre operacional.'}</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions><Button asChild variant="outline"><Link href="/dashboard/acciones"><ArrowLeft className="h-4 w-4" />Mis acciones</Link></Button></PageHeaderActions>
    </PageHeader>

    <div className="grid gap-4 md:grid-cols-3">
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Responsabilidad</CardDescription></CardHeader><CardContent><Badge variant="outline">{data.task.responsibility_label || data.task.responsibility}</Badge></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Urgencia</CardDescription></CardHeader><CardContent><Badge variant={data.task.severity === 'critical' ? 'destructive' : 'outline'}>{data.task.urgency_label || data.task.severity}</Badge></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Validación</CardDescription></CardHeader><CardContent><Badge variant={shipment.validation_status === 'approved' ? 'secondary' : 'outline'}>{show(shipment.validation_status)}</Badge></CardContent></Card>
    </div>

    <Card className="shadow-none border-primary/30">
      <CardHeader><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" /><div><CardTitle className="text-base">Qué corresponde hacer</CardTitle><CardDescription>Acción definida para tu cargo sobre este despacho.</CardDescription></div></div></CardHeader>
      <CardContent><p className="text-sm font-medium leading-6">{data.task.role_action || 'Validar el despacho y resolver la observación antes de cierre operacional.'}</p></CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-base">Evidencia del despacho</CardTitle><CardDescription>Datos canónicos y trazabilidad de la fuente original.</CardDescription></CardHeader>
      <CardContent className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([label, value]) => <div key={label} className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{show(value)}</p></div>)}
      </CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-base">Observación de validación</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm leading-6">
        <div><p className="text-xs text-muted-foreground">Observación</p><p className="mt-1">{show(shipment.validation_notes)}</p></div>
        <div><p className="text-xs text-muted-foreground">Regla de normalización</p><p className="mt-1">{show(shipment.normalization_rule)}</p></div>
      </CardContent>
    </Card>

    <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>Este workspace conserva la fuente tal como llegó. No completa una ley faltante ni calcula fino cuando la evidencia original no lo permite.</p>
    </div>
  </div>;
}
