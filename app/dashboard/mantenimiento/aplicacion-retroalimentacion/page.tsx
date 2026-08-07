'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fetcher = async (url: string) => { const response = await fetch(url, { credentials: 'include', cache: 'no-store' }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar.'); return payload; };
const labels: Record<string,string> = { strategy_review:'Estrategia', preventive_frequency_review:'Frecuencia preventiva', lifecycle_review:'Ciclo de vida' };

export default function FeedbackApplicationPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('/api/maintenance/feedback-change-proposals', fetcher, { revalidateOnFocus:false });
  const [form, setForm] = useState<Record<string,string>>({});
  const [message, setMessage] = useState('');
  const submit = async (item:any) => {
    setMessage('');
    const payload:any = { feedbackId:item.feedback.id, reason:form[`reason-${item.feedback.id}`] || '' };
    if (item.feedback.feedback_type === 'strategy_review') Object.assign(payload,{ maintenanceStrategy:form[`strategy-${item.feedback.id}`], criticalityLevel:form[`criticality-${item.feedback.id}`] });
    if (item.feedback.feedback_type === 'preventive_frequency_review') Object.assign(payload,{ targetRecordId:form[`preventive-${item.feedback.id}`], frequencyDays:form[`days-${item.feedback.id}`] || null, frequencyHours:form[`hours-${item.feedback.id}`] || null });
    if (item.feedback.feedback_type === 'lifecycle_review') Object.assign(payload,{ decisionType:form[`decision-${item.feedback.id}`], targetDate:form[`date-${item.feedback.id}`] || null });
    const response = await fetch('/api/maintenance/feedback-change-proposals',{ method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
    const result = await response.json().catch(() => null); if (!response.ok) { setMessage(result?.error || 'No se pudo crear la propuesta.'); return; } setMessage('Propuesta operacional creada.'); await mutate();
  };
  const set = (key:string,value:string) => setForm((current)=>({...current,[key]:value}));
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Mantenimiento · Retroalimentación</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Aplicación controlada</h1><p className="mt-2 max-w-4xl text-sm text-muted-foreground">Convierte una retroalimentación aceptada en una propuesta operacional. La fuente vigente no cambia en este paso.</p></div><Button variant="outline" onClick={()=>void mutate()} disabled={isValidating}><RefreshCw className={`mr-2 h-4 w-4 ${isValidating?'animate-spin':''}`}/>Actualizar</Button></section>
    <Card><CardHeader><CardTitle className="text-base">Regla de integridad</CardTitle><CardDescription>{data?.integrityRule || 'Solo una retroalimentación aceptada puede iniciar una propuesta.'}</CardDescription></CardHeader></Card>
    {message ? <p className="text-sm">{message}</p> : null}{error ? <p className="text-sm text-destructive">{error.message}</p> : null}
    {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : (data?.items?.length || 0) === 0 ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No existen retroalimentaciones aceptadas. No se crean propuestas de demostración.</CardContent></Card> : data.items.map((item:any)=><Card key={item.feedback.id}><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge>{labels[item.feedback.feedback_type] || item.feedback.feedback_type}</Badge>{item.proposal ? <Badge variant="outline">{item.proposal.status}</Badge> : null}</div><CardTitle className="text-base">{item.asset ? `${item.asset.asset_code} · ${item.asset.name}` : 'Activo canónico'}</CardTitle><CardDescription>{item.feedback.reason}</CardDescription></CardHeader><CardContent className="space-y-3">{item.proposal ? <p className="text-sm text-muted-foreground">Esta retroalimentación ya tiene una aplicación activa.</p> : <>
      {item.feedback.feedback_type==='strategy_review' ? <div className="grid gap-3 md:grid-cols-2"><Select onValueChange={(v)=>set(`strategy-${item.feedback.id}`,v)}><SelectTrigger><SelectValue placeholder="Nueva estrategia"/></SelectTrigger><SelectContent><SelectItem value="preventive">Preventiva</SelectItem><SelectItem value="predictive">Predictiva</SelectItem><SelectItem value="inspection">Inspección</SelectItem><SelectItem value="run_to_failure">Run to failure</SelectItem></SelectContent></Select><Select onValueChange={(v)=>set(`criticality-${item.feedback.id}`,v)}><SelectTrigger><SelectValue placeholder="Criticidad"/></SelectTrigger><SelectContent><SelectItem value="critical">Crítica</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="low">Baja</SelectItem></SelectContent></Select></div> : null}
      {item.feedback.feedback_type==='preventive_frequency_review' ? <div className="grid gap-3 md:grid-cols-3"><Select onValueChange={(v)=>set(`preventive-${item.feedback.id}`,v)}><SelectTrigger><SelectValue placeholder="Preventivo"/></SelectTrigger><SelectContent>{item.preventives.map((p:any)=><SelectItem key={p.id} value={p.id}>{p.task_name}</SelectItem>)}</SelectContent></Select><Input type="number" min="1" placeholder="Frecuencia días" onChange={(e)=>set(`days-${item.feedback.id}`,e.target.value)}/><Input type="number" min="0.1" step="0.1" placeholder="Frecuencia horas" onChange={(e)=>set(`hours-${item.feedback.id}`,e.target.value)}/></div> : null}
      {item.feedback.feedback_type==='lifecycle_review' ? <div className="grid gap-3 md:grid-cols-2"><Select onValueChange={(v)=>set(`decision-${item.feedback.id}`,v)}><SelectTrigger><SelectValue placeholder="Decisión"/></SelectTrigger><SelectContent>{['maintain','repair','rebuild','replace','retire'].map((v)=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Input type="date" onChange={(e)=>set(`date-${item.feedback.id}`,e.target.value)}/></div> : null}
      <Input placeholder="Fundamento del cambio propuesto" onChange={(e)=>set(`reason-${item.feedback.id}`,e.target.value)}/><Button onClick={()=>void submit(item)}>Crear propuesta operacional</Button></>}</CardContent></Card>)}
  </div>;
}