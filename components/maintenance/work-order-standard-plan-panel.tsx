'use client';

import useSWR from 'swr';
import { ClipboardCheck, ShieldCheck, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el plan estándar');
  return payload;
};

export function WorkOrderStandardPlanPanel({ workOrderId }: { workOrderId: string }) {
  const { data, error, isLoading } = useSWR(workOrderId ? `/api/maintenance/work-orders/${workOrderId}/standard-plan` : null, fetcher, { revalidateOnFocus: false });
  const plan = data?.standardPlan;

  if (isLoading) return <Card className="shadow-none"><CardContent className="p-5 text-sm text-muted-foreground">Cargando procedimiento estándar…</CardContent></Card>;
  if (error) return <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="p-5 text-sm text-destructive">No se pudo cargar el procedimiento estándar.</CardContent></Card>;
  if (!plan) return <Card className="shadow-none"><CardContent className="p-5"><div className="flex items-start gap-3"><ClipboardCheck className="mt-0.5 h-5 w-5 text-muted-foreground"/><div><p className="font-medium">Sin plan estándar aplicado</p><p className="mt-1 text-sm text-muted-foreground">La OT puede ejecutarse con su evidencia propia. Cuando la pauta tenga un plan aprobado, Motil lo aplicará sin inventar pasos ni repuestos.</p></div></div></CardContent></Card>;

  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  const materials = Array.isArray(plan.materials) ? plan.materials : [];

  return <Card className="shadow-none">
    <CardHeader className="border-b border-border/70 pb-4"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge>Plan aprobado</Badge><Badge variant="outline">{plan.plan_code}</Badge></div><CardTitle className="mt-3 text-base">{plan.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Aplicado a esta OT. El procedimiento conserva la evidencia aprobada del plan.</p></div><div className="text-xs text-muted-foreground">{plan.estimated_duration_hours != null ? `${plan.estimated_duration_hours} h estimadas` : 'Duración sin dato'}{plan.labor_people_required ? ` · ${plan.labor_people_required} persona(s)` : ''}</div></div></CardHeader>
    <CardContent className="space-y-5 p-5">
      {(plan.safety_controls || plan.skill_requirement || plan.required_document_reference) ? <div className="rounded-lg border p-4"><div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4"/>Controles previos</div><div className="mt-2 space-y-1 text-sm text-muted-foreground">{plan.safety_controls ? <p>Seguridad: {plan.safety_controls}</p> : null}{plan.skill_requirement ? <p>Competencia: {plan.skill_requirement}</p> : null}{plan.required_document_reference ? <p>Documento: {plan.required_document_reference}</p> : null}</div></div> : null}
      <div><p className="text-sm font-medium">Secuencia de trabajo</p>{steps.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">El plan aplicado no contiene pasos.</p> : <div className="mt-3 space-y-2">{steps.map((step: any) => <div key={step.id} className="rounded-lg border p-3"><div className="flex gap-3"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">{step.sequence_no}</div><div><p className="text-sm font-medium">{step.title}</p>{step.instructions ? <p className="mt-1 text-sm text-muted-foreground">{step.instructions}</p> : null}{step.control_requirement ? <p className="mt-1 text-xs text-muted-foreground">Control: {step.control_requirement}</p> : null}{step.required_document_reference ? <p className="mt-1 text-xs text-muted-foreground">Documento: {step.required_document_reference}</p> : null}</div></div></div>)}</div>}</div>
      <div><p className="text-sm font-medium">Repuestos requeridos</p>{materials.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">El plan no define repuestos obligatorios.</p> : <div className="mt-3 divide-y rounded-lg border">{materials.map((material: any) => <div key={material.id} className="flex items-center justify-between gap-4 p-3 text-sm"><div><p className="font-medium">{material.product?.product_code || 'Producto canónico'} · {material.product?.name || 'Sin nombre'}</p>{material.notes ? <p className="text-xs text-muted-foreground">{material.notes}</p> : null}</div><div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground"/><span>{Number(material.quantity_required).toLocaleString('es-CL')} {material.product?.unit || ''}</span></div></div>)}</div>}</div>
    </CardContent>
  </Card>;
}
