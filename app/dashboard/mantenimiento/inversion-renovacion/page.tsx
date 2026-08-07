'use client';

import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, DollarSign, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Need = { id:string; target_amount:number|string; target_date:string|null; status:string; reason:string; evidence_reference:string|null };
type Center = { id:string; code:string; name:string; budgetAnnual:number|null; budgetUsed:number; budgetAvailable:number|null; approvedNeedTotal:number; proposedNeedTotal:number; fundingGap:number|null };
type Item = { decision:{id:string;decision_type:string;reason:string;target_date:string|null}; asset:{id:string;asset_code:string;name:string;asset_type:string|null;cost_center_code:string|null}|null; need:Need|null; costCenter:Center|null; gaps:string[] };
type Data = { counts:{candidates:number;proposed:number;approved:number;withoutNeed:number;withFundingGap:number}; items:Item[]; centers:Center[]; generatedAt:string };

const fetcher=async(url:string)=>{const response=await fetch(url,{credentials:'include',cache:'no-store'});const payload=await response.json().catch(()=>null);if(!response.ok)throw new Error(payload?.error||'No se pudo cargar');return payload as Data;};
const amount=(value:number|null|undefined)=>value===null||value===undefined?'Sin dato':new Intl.NumberFormat('es-CL',{maximumFractionDigits:2}).format(value);
const decisionLabels:Record<string,string>={rebuild:'Reconstruir',replace:'Reemplazar'};

export default function RenewalInvestmentPage(){
  const {data,error,isLoading,isValidating,mutate}=useSWR('/api/maintenance/renewal-investments',fetcher,{revalidateOnFocus:false});
  const [query,setQuery]=useState('');
  const [showForm,setShowForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [form,setForm]=useState({lifecycleDecisionId:'',targetAmount:'',targetDate:'',reason:'',evidenceReference:''});
  const candidates=useMemo(()=>data?.items.filter(row=>!row.need&&row.asset&&row.costCenter)||[],[data?.items]);
  const filtered=useMemo(()=> (data?.items||[]).filter(row=>!query.trim()||`${row.asset?.asset_code||''} ${row.asset?.name||''} ${row.costCenter?.code||''} ${row.decision.decision_type}`.toLowerCase().includes(query.toLowerCase())),[data?.items,query]);

  async function submit(event:FormEvent){
    event.preventDefault();setSaving(true);setMessage(null);
    const response=await fetch('/api/maintenance/renewal-investments',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(form)});
    const payload=await response.json().catch(()=>null);setSaving(false);
    if(!response.ok){setMessage(payload?.error||'No se pudo guardar.');return;}
    setMessage('Necesidad de inversión propuesta. No reserva ni descuenta presupuesto hasta que exista un proceso financiero explícito.');
    setShowForm(false);setForm({lifecycleDecisionId:'',targetAmount:'',targetDate:'',reason:'',evidenceReference:''});await mutate();
  }

  async function changeStatus(id:string,status:string){
    const response=await fetch('/api/maintenance/renewal-investments',{method:'PATCH',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});
    const payload=await response.json().catch(()=>null);
    if(!response.ok){setMessage(payload?.error||'No se pudo actualizar.');return;}
    setMessage(status==='approved'?'Necesidad aprobada. La brecha de financiamiento fue recalculada contra el presupuesto registrado.':'Necesidad actualizada.');await mutate();
  }

  const counts=data?.counts;
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-muted-foreground">Mantenimiento · Renovación</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Planificación de inversión de activos</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Convierte decisiones aprobadas de reconstrucción o reemplazo en necesidades trazables y las compara con presupuesto real del centro de costo. Motil no inventa montos, cotizaciones ni disponibilidad financiera.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={()=>void mutate()} disabled={isValidating}><RefreshCw className={`mr-2 h-4 w-4 ${isValidating?'animate-spin':''}`}/>Actualizar</Button><Button onClick={()=>setShowForm(value=>!value)} disabled={candidates.length===0}><Plus className="mr-2 h-4 w-4"/>Proponer inversión</Button></div>
    </section>

    {message&&<Card className="shadow-none"><CardContent className="p-4 text-sm">{message}</CardContent></Card>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[['Candidatos',counts?.candidates||0],['Sin necesidad',counts?.withoutNeed||0],['Propuestas',counts?.proposed||0],['Aprobadas',counts?.approved||0],['Centros con brecha',counts?.withFundingGap||0]].map(([label,value])=><Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{Number(value).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>

    {showForm&&<Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Nueva necesidad de inversión</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2"><Label>Decisión aprobada de ciclo de vida</Label><Select value={form.lifecycleDecisionId} onValueChange={value=>setForm({...form,lifecycleDecisionId:value})}><SelectTrigger><SelectValue placeholder="Seleccionar activo"/></SelectTrigger><SelectContent>{candidates.map(row=><SelectItem key={row.decision.id} value={row.decision.id}>{row.asset!.asset_code} · {row.asset!.name} · {decisionLabels[row.decision.decision_type]||row.decision.decision_type}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Monto objetivo</Label><Input inputMode="decimal" placeholder="Monto ingresado explícitamente" value={form.targetAmount} onChange={event=>setForm({...form,targetAmount:event.target.value})}/><p className="text-xs text-muted-foreground">Debe usar la misma unidad monetaria del presupuesto del centro de costo.</p></div>
      <div className="space-y-2"><Label>Fecha objetivo opcional</Label><Input type="date" value={form.targetDate} onChange={event=>setForm({...form,targetDate:event.target.value})}/></div>
      <div className="space-y-2 md:col-span-2"><Label>Fundamento</Label><Textarea rows={3} value={form.reason} onChange={event=>setForm({...form,reason:event.target.value})}/></div>
      <div className="space-y-2 md:col-span-2"><Label>Evidencia o referencia</Label><Input value={form.evidenceReference} onChange={event=>setForm({...form,evidenceReference:event.target.value})}/></div>
      <div className="md:col-span-2 flex gap-2"><Button disabled={saving||!form.lifecycleDecisionId||!form.targetAmount||!form.reason}>Guardar propuesta</Button><Button type="button" variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Button></div>
    </form></CardContent></Card>}

    {data?.centers?.length?<Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Cobertura presupuestaria por centro de costo</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.centers.map(center=><div key={center.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{center.code} · {center.name}</p><p className="mt-1 text-xs text-muted-foreground">Presupuesto anual: {amount(center.budgetAnnual)} · usado: {amount(center.budgetUsed)}</p></div>{center.fundingGap!==null&&center.fundingGap>0?<Badge variant="destructive">Brecha {amount(center.fundingGap)}</Badge>:center.budgetAnnual===null?<Badge variant="secondary">Sin presupuesto</Badge>:<Badge variant="outline">Sin brecha</Badge>}</div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><p className="text-muted-foreground">Disponible</p><p className="font-medium">{amount(center.budgetAvailable)}</p></div><div><p className="text-muted-foreground">Aprobado</p><p className="font-medium">{amount(center.approvedNeedTotal)}</p></div><div><p className="text-muted-foreground">Propuesto</p><p className="font-medium">{amount(center.proposedNeedTotal)}</p></div></div></div>)}</CardContent></Card>:null}

    <Input placeholder="Buscar activo o centro de costo" value={query} onChange={event=>setQuery(event.target.value)}/>
    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Decisiones elegibles · {filtered.length}</CardTitle></CardHeader><CardContent className="p-0">{error?<div className="p-6 text-sm text-muted-foreground">No se pudo cargar la planificación de inversión.</div>:isLoading?<div className="p-6 text-sm text-muted-foreground">Cargando…</div>:filtered.length===0?<div className="p-8 text-center text-sm text-muted-foreground"><DollarSign className="mx-auto mb-3 h-5 w-5"/>No existen decisiones aprobadas de reconstrucción o reemplazo. La pantalla permanece vacía hasta que el Bloque 32 genere evidencia real.</div>:<div className="divide-y border-t">{filtered.map(row=><div key={row.decision.id} className="p-4"><div className="flex flex-col gap-4 xl:flex-row xl:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant="outline">{decisionLabels[row.decision.decision_type]||row.decision.decision_type}</Badge>{row.need?<Badge variant={row.need.status==='approved'?'default':'secondary'}>{row.need.status==='approved'?'Inversión aprobada':'Inversión propuesta'}</Badge>:<Badge variant="secondary">Sin necesidad de inversión</Badge>}{row.gaps.length>0&&<Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3"/>{row.gaps.length} brecha(s)</Badge>}</div><p className="mt-3 font-medium">{row.asset?`${row.asset.asset_code} · ${row.asset.name}`:'Activo no disponible'}</p><p className="mt-1 text-xs text-muted-foreground">Centro de costo: {row.costCenter?`${row.costCenter.code} · ${row.costCenter.name}`:'Sin relación presupuestaria'}</p><p className="mt-2 text-sm">Decisión: {row.decision.reason}</p>{row.need&&<div className="mt-3 rounded-lg bg-muted/35 p-3 text-sm"><p><strong>Monto objetivo:</strong> {amount(Number(row.need.target_amount))}</p><p className="mt-1"><strong>Fundamento:</strong> {row.need.reason}</p>{row.need.target_date&&<p className="mt-1"><strong>Fecha objetivo:</strong> {new Date(`${row.need.target_date}T00:00:00`).toLocaleDateString('es-CL')}</p>}</div>}{row.costCenter&&<div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge variant="outline">Presupuesto: {amount(row.costCenter.budgetAnnual)}</Badge><Badge variant="outline">Disponible: {amount(row.costCenter.budgetAvailable)}</Badge><Badge variant="outline">Necesidades aprobadas: {amount(row.costCenter.approvedNeedTotal)}</Badge></div>}{row.gaps.length>0&&<div className="mt-3 space-y-1 text-sm text-destructive">{row.gaps.map(gap=><p key={gap}>• {gap}</p>)}</div>}</div><div className="shrink-0 flex gap-2">{row.need?.status==='proposed'&&<Button size="sm" onClick={()=>void changeStatus(row.need!.id,'approved')}><CheckCircle2 className="mr-2 h-4 w-4"/>Aprobar</Button>}{row.need?.status==='approved'&&<Button size="sm" variant="outline" onClick={()=>void changeStatus(row.need!.id,'inactive')}>Inactivar</Button>}</div></div></div>)}</div>}</CardContent></Card>
    <p className="text-xs text-muted-foreground">Aprobar una necesidad no modifica `budget_annual` ni `budget_used`. La comparación es informativa y trazable; cualquier reserva, compromiso o ejecución financiera requiere un flujo explícito posterior.</p>
  </div>;
}
