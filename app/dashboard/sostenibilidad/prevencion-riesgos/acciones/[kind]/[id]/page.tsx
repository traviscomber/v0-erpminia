'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react';
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

type HSEKind = 'incident' | 'inspection' | 'risk';

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
  kind: HSEKind;
  task: Task;
  record: Record<string, unknown>;
  source: string;
  authorizationBoundary: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar la acción HSE.');
  return payload;
};

const formatDate = (value: unknown) => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date);
};

const show = (value: unknown) => value === null || value === undefined || value === '' ? '—' : String(value);

function kindLabel(kind: HSEKind) {
  if (kind === 'incident') return 'Incidente';
  if (kind === 'inspection') return 'Inspección';
  return 'Riesgo';
}

export default function HSEActionPage() {
  const params = useParams<{ kind: string; id: string }>();
  const kind = params.kind;
  const id = params.id;
  const { data, error, isLoading, mutate } = useSWR<Payload>(
    kind && id ? `/api/actions/hse-record/${encodeURIComponent(kind)}/${encodeURIComponent(id)}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) return <StatePanel tone="loading" title="Cargando evidencia HSE" className="min-h-64" />;
  if (error) return <StatePanel tone="error" title="No fue posible abrir esta acción" description={error.message} actions={<><Button asChild variant="outline"><Link href="/dashboard/acciones">Volver a Mis acciones</Link></Button><Button variant="outline" onClick={() => void mutate()}>Reintentar</Button></>} className="min-h-64" />;
  if (!data) return <StatePanel title="Acción HSE no disponible" actions={<Button asChild variant="outline"><Link href="/dashboard/acciones">Volver a Mis acciones</Link></Button>} className="min-h-64" />;

  const record = data.record;
  let fields: Array<[string, unknown]>;
  let detailTitle: string;
  let detailBlocks: Array<[string, unknown]>;

  if (data.kind === 'incident') {
    fields = [
      ['Número', record.incident_number],
      ['Tipo', record.incident_type],
      ['Fecha del incidente', formatDate(record.date_occurred)],
      ['Ubicación', record.location],
      ['Severidad', record.severity],
      ['Lesiones', record.injuries_count],
      ['Estado', record.status],
      ['Investigación', record.investigation_status],
      ['Causa raíz identificada', record.root_cause_identified === true ? 'Sí' : record.root_cause_identified === false ? 'No' : '—'],
      ['Responsable', record.assigned_to],
    ];
    detailTitle = 'Descripción reportada';
    detailBlocks = [['Descripción', record.description]];
  } else if (data.kind === 'inspection') {
    fields = [
      ['Número', record.inspection_number],
      ['Tipo', record.inspection_type],
      ['Alcance / área', record.scope],
      ['Fecha programada', formatDate(record.scheduled_date)],
      ['Fecha realizada', formatDate(record.actual_date)],
      ['Hallazgos', record.findings_count],
      ['Estado', record.status],
    ];
    detailTitle = 'Evidencia de la inspección';
    detailBlocks = [['Notas', record.notes]];
  } else {
    fields = [
      ['Peligro', record.hazard_id],
      ['Área / proceso', record.process_or_area],
      ['Probabilidad', record.likelihood],
      ['Severidad', record.severity],
      ['Nivel de riesgo', record.risk_level],
      ['Riesgo residual', record.residual_risk_level],
      ['Efectividad del control', record.control_effectiveness],
      ['Responsable', record.risk_owner],
      ['Última revisión', formatDate(record.last_review_date)],
      ['Próxima revisión', formatDate(record.next_review_date)],
      ['Estado', record.status],
    ];
    detailTitle = 'Peligro y controles';
    detailBlocks = [
      ['Descripción', record.hazard_description],
      ['Controles actuales', record.current_controls],
      ['Plan de mitigación', record.mitigation_plan],
    ];
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>HSE · {kindLabel(data.kind)}</PageHeaderEyebrow>
        <PageHeaderTitle>{data.task.title}</PageHeaderTitle>
        <PageHeaderDescription>{data.task.evidence_summary || 'Evidencia operacional asociada a la acción de tu cargo.'}</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions><Button asChild variant="outline"><Link href="/dashboard/acciones"><ArrowLeft className="h-4 w-4" />Mis acciones</Link></Button></PageHeaderActions>
    </PageHeader>

    <div className="grid gap-4 md:grid-cols-3">
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Responsabilidad</CardDescription></CardHeader><CardContent><Badge variant="outline">{data.task.responsibility_label || data.task.responsibility}</Badge></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Urgencia</CardDescription></CardHeader><CardContent><Badge variant={data.task.severity === 'critical' ? 'destructive' : 'outline'}>{data.task.urgency_label || data.task.severity}</Badge></CardContent></Card>
      <Card className="shadow-none"><CardHeader className="pb-2"><CardDescription>Vence</CardDescription></CardHeader><CardContent><p className="font-medium">{formatDate(data.task.due_at)}</p></CardContent></Card>
    </div>

    <Card className="shadow-none border-primary/30">
      <CardHeader><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div><CardTitle className="text-base">Qué corresponde hacer</CardTitle><CardDescription>Acción definida para tu cargo sobre este registro.</CardDescription></div></div></CardHeader>
      <CardContent><p className="text-sm font-medium leading-6">{data.task.role_action || 'Revisar la evidencia y coordinar la resolución según el procedimiento HSE.'}</p></CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-base">Evidencia del registro</CardTitle><CardDescription>Fuente operacional protegida por la misma asignación de cargo que originó la tarea.</CardDescription></CardHeader>
      <CardContent className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([label, value]) => <div key={label} className="bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{show(value)}</p></div>)}
      </CardContent>
    </Card>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-base">{detailTitle}</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm leading-6">
        {detailBlocks.map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1">{show(value)}</p></div>)}
      </CardContent>
    </Card>

    <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>Este workspace es de revisión y decisión. No modifica automáticamente el registro HSE; cualquier cierre o cambio operacional debe quedar trazado en su flujo correspondiente.</p>
    </div>
  </div>;
}
