'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CheckCircle2, ClipboardList, PackagePlus, Plus, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const fetcher = async (url:string) => { const response = await fetch(url,{credentials:'include'}); const payload = await response.json().catch(()=>null); if(!response.ok) throw new Error(payload?.error || 'No se pudo cargar el plan'); return payload; };

export default function ProgressiveStandardPlanPage(){
  const params = useSearchParams();
  const scheduleId = params.get('scheduleId') || '';
  const { data, error, isLoading, mutate } = useSWR(scheduleId ? `/api/maintenance/standard-job-plans/progressive?scheduleId=${encodeURIComponent(scheduleId)}` : null, fetcher, { revalidateOnFocus:false });
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState<string|null>(null);
  const [step,setStep] = useState({title:'',instructions:'',controlRequirement:'',estimatedMinutes:''});
  const [material,setMaterial] = useState({productCode:'',quantityRequired:'',notes:''});

  const plan = data?.plan;
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const materials = Array.isArray(data?.materials) ? data.materials : [];
  const stage = useMemo(()=> !plan ? 'propose' : plan.status === 'approved' ? 'approved' : steps.length === 0 ? 'first_step' : 'review', [plan,steps.length]);

  async function action(body:Record<string,unknown>){
    setSaving(true); setMessage(null);
    try{
      const response = await fetch('/api/maintenance/standard-job-plans/progressive',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      const payload = await response.json().catch(()=>null);
      if(!response.ok) throw new Error(payload?.error || 'No se pudo guardar');
      await mutate();
      return payload;
    }catch(cause){ setMessage(cause instanceof Error ? cause.message : 'No se pudo guardar'); return null; }
    finally{ setSaving(false); }
  }

  async function addStep(e:FormEvent){ e.preventDefault(); if(!plan) return; const result = await action({action:'add_step',planId:plan.id,title:step.title,instructions:step.instructions,controlRequirement:step.controlRequirement,estimatedMinutes:step.estimatedMinutes?Number(step.estimatedMinutes):null}); if(result){setStep({title:'',instructions:'',controlRequirement:'',estimatedMinutes:''});setMessage('Paso agregado.');}}
  async function addMaterial(e:FormEvent){ e.preventDefault(); if(!plan) return; const result = await action({action:'add_material',planId:plan.id,productCode:material.productCode,quantityRequired:Number(material.quantityRequired),notes:material.notes}); if(result){setMaterial({productCode:'',quantityRequired:'',notes:''});setMessage('Repuesto agregado.');}}

  if(!scheduleId) return <Card className="shadow-none"><CardContent className="p-6 text-sm text-muted-foreground">Abre este flujo desde una pauta preventiva específica.</CardContent></Card>;
  if(isLoading) return <Card className="shadow-none"><CardContent className="p-6 text-sm text-muted-foreground">Cargando pauta y plan…</CardContent></Card>;
  if(error) return <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="p-6 text-sm text-destructive">No se pudo cargar el plan estándar.</CardContent></Card>;

  const schedule = data?.schedule;
  return <div className="space-y-6">
    <section className="border-b border-border/70 pb-6"><p className="text-sm font-medium text-muted-foreground">Mantenimiento · plan estándar progresivo</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{schedule?.task_name || 'Plan estándar'}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Documenta sólo evidencia real. Motil no propone pasos, controles ni repuestos por defecto.</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">Cada {Number(schedule?.frequency_hours||0).toLocaleString('es-CL')} h</Badge><Badge variant="outline">Fuente: {schedule?.source_reference || 'Sin referencia'}</Badge>{plan?<Badge>{plan.status==='approved'?'Aprobado':'Propuesto'}</Badge>:<Badge variant="secondary">Sin plan</Badge>}</div></section>

    {message?<Card className="shadow-none"><CardContent className="p-4 text-sm">{message}</CardContent></Card>:null}

    <div className="grid gap-3 md:grid-cols-4">{[
      ['1. Propuesta',Boolean(plan)],['2. Pasos',steps.length>0],['3. Repuestos',materials.length>0],['4. Aprobación',plan?.status==='approved']
    ].map(([label,done])=><Card key={String(label)} className="shadow-none"><CardContent className="p-4"><div className="flex items-center gap-2">{done?<CheckCircle2 className="h-4 w-4"/>:<span className="h-4 w-4 rounded-full border"/>}<span className="text-sm font-medium">{label}</span></div></CardContent></Card>)}</div>

    {stage==='propose'?<Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Crear propuesta desde esta pauta</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">Se copiarán únicamente tarea, equipo, duración disponible y referencia fuente. No se crearán pasos ni repuestos.</p><Button disabled={saving||!data?.canEdit} onClick={()=>void action({action:'propose',scheduleId})}>Crear propuesta<ArrowRight className="ml-2 h-4 w-4"/></Button></CardContent></Card>:null}

    {plan && plan.status!=='approved'?<Card className="shadow-none"><CardHeader><CardTitle className="text-lg">{steps.length===0?'Siguiente acción: registrar primer paso':'Procedimiento'}</CardTitle></CardHeader><CardContent className="space-y-5"><form onSubmit={addStep} className="grid gap-4 md:grid-cols-2"><div className="space-y-2 md:col-span-2"><Label>Título del paso</Label><Input value={step.title} onChange={e=>setStep({...step,title:e.target.value})} placeholder="Acción verificable"/></div><div className="space-y-2 md:col-span-2"><Label>Instrucción</Label><Textarea rows={3} value={step.instructions} onChange={e=>setStep({...step,instructions:e.target.value})}/></div><div className="space-y-2"><Label>Control de seguridad / calidad</Label><Input value={step.controlRequirement} onChange={e=>setStep({...step,controlRequirement:e.target.value})}/></div><div className="space-y-2"><Label>Minutos estimados</Label><Input type="number" min="0" step="1" value={step.estimatedMinutes} onChange={e=>setStep({...step,estimatedMinutes:e.target.value})}/></div><div className="md:col-span-2"><Button disabled={saving||!data?.canEdit}><Plus className="mr-2 h-4 w-4"/>Agregar paso</Button></div></form>
      {steps.length>0?<div className="space-y-2 border-t pt-4">{steps.map((row:any)=><div key={row.id} className="rounded-md border p-3"><div className="flex gap-2"><ClipboardList className="mt-0.5 h-4 w-4"/><div><p className="text-sm font-medium">{row.sequence_no}. {row.title}</p>{row.instructions?<p className="mt-1 text-sm text-muted-foreground">{row.instructions}</p>:null}{row.control_requirement?<p className="mt-1 text-xs"><ShieldCheck className="mr-1 inline h-3.5 w-3.5"/>{row.control_requirement}</p>:null}</div></div></div>)}</div>:null}
    </CardContent></Card>:null}

    {plan && plan.status!=='approved' && steps.length>0?<Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Repuestos requeridos</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">Opcional. Sólo agrega un repuesto cuando exista un producto canónico exacto y una cantidad conocida.</p><form onSubmit={addMaterial} className="grid gap-3 md:grid-cols-3"><Input placeholder="Código producto canónico" value={material.productCode} onChange={e=>setMaterial({...material,productCode:e.target.value})}/><Input type="number" min="0.001" step="0.001" placeholder="Cantidad" value={material.quantityRequired} onChange={e=>setMaterial({...material,quantityRequired:e.target.value})}/><Input placeholder="Nota opcional" value={material.notes} onChange={e=>setMaterial({...material,notes:e.target.value})}/><div className="md:col-span-3"><Button variant="outline" disabled={saving||!data?.canEdit||!material.productCode.trim()}><PackagePlus className="mr-2 h-4 w-4"/>Agregar repuesto</Button></div></form>{materials.length>0?<p className="mt-4 text-sm">{materials.length} repuesto(s) definidos.</p>:<p className="mt-4 text-xs text-muted-foreground">Sin repuestos definidos. Esto no bloquea la aprobación si el procedimiento no los requiere.</p>}</CardContent></Card>:null}

    {plan && plan.status!=='approved' && steps.length>0?<Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Aprobación</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">La aprobación requiere permiso gerencial. Después de aprobar, el plan queda activo para esta pauta.</p><Button disabled={saving} onClick={()=>void action({action:'approve',planId:plan.id})}><CheckCircle2 className="mr-2 h-4 w-4"/>Aprobar plan</Button></CardContent></Card>:null}

    {stage==='approved'?<Card className="border-emerald-200 bg-emerald-50/50 shadow-none"><CardContent className="p-6"><p className="font-medium">Plan aprobado y vinculado a la pauta</p><p className="mt-1 text-sm text-muted-foreground">Las futuras OT pueden aplicar este procedimiento y sus requerimientos de materiales sin inventar consumos.</p><Button asChild className="mt-4" variant="outline"><Link href="/dashboard/mantenimiento/preventivo-horas">Volver a preventivo por horas</Link></Button></CardContent></Card>:null}
  </div>;
}
