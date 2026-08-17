'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url:string)=>{const r=await fetch(url,{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Error');return d;};

export default function SupplierCandidatesPage(){
  const [area,setArea]=useState(''); const [name,setName]=useState('');
  const {data,error,isLoading,mutate}=useSWR(`/api/procurement/supplier-candidates${area?`?area=${encodeURIComponent(area)}`:''}`,fetcher);
  const add=async()=>{if(!name.trim())return;const r=await fetch('/api/procurement/supplier-candidates',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),businessType:area||null})});if(r.ok){setName('');await mutate();}};
  const decide=async(id:string,approve:boolean)=>{const reason=approve?null:window.prompt('Motivo del rechazo:');if(!approve&&!reason)return;const r=await fetch('/api/procurement/supplier-candidates',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,approve,reason})});if(!r.ok){const d=await r.json().catch(()=>({}));window.alert(d.error||'No se pudo procesar');return;}await mutate();};
  if(error)return <StatePanel tone="error" title="No fue posible cargar proveedores" description={error.message}/>;
  return <div className="space-y-6">
    <div><p className="text-sm font-medium text-primary">Compras · Cotización</p><h1 className="mt-1 text-3xl font-semibold">Proveedores del área</h1><p className="mt-2 text-sm text-muted-foreground">Compara primero proveedores existentes y candidatos del rubro. Un candidato sólo puede cotizar después de ser aprobado y promovido al maestro de proveedores.</p></div>
    <Card><CardHeader><CardTitle>Buscar y proponer proveedor</CardTitle><CardDescription>Usa el rubro/área para reducir la comparación.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 md:flex-row"><Input value={area} onChange={e=>setArea(e.target.value)} placeholder="Área o rubro, ej. EPP"/><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Nuevo proveedor candidato"/><Button onClick={add}>Proponer</Button></CardContent></Card>
    {isLoading?<StatePanel tone="loading" title="Cargando comparación"/>:<>
      <Card><CardHeader><CardTitle>Proveedores habilitados para cotizar</CardTitle><CardDescription>{data?.suppliers?.length||0} proveedores activos en la comparación actual.</CardDescription></CardHeader><CardContent><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(data?.suppliers||[]).map((s:any)=><div key={s.id} className="rounded-md border p-3"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.business_type||'Sin rubro'} · {s.city||s.region||'Sin ubicación'}</p></div>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Proveedores candidatos</CardTitle><CardDescription>Pendientes no pueden participar en una cotización.</CardDescription></CardHeader><CardContent className="space-y-2">{(data?.candidates||[]).map((c:any)=><div key={c.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.business_type||'Sin rubro'}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{c.approval_status}</Badge>{data?.canApprove&&c.approval_status==='pending'?<><Button size="sm" onClick={()=>decide(c.id,true)}>Aprobar</Button><Button size="sm" variant="destructive" onClick={()=>decide(c.id,false)}>Rechazar</Button></>:null}</div></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>EPP: costo total observado</CardTitle><CardDescription>Para cotizaciones de EPP se muestra durabilidad real además del precio.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b text-left"><tr><th className="py-2">EPP</th><th>Marca / modelo</th><th>Proveedor</th><th>Costo/día</th><th>Vida observada</th><th>Fallas</th></tr></thead><tbody>{(data?.eppComparison||[]).map((r:any)=><tr key={r.epp_catalog_id} className="border-b"><td className="py-3">{r.epp_type}</td><td>{[r.brand,r.model].filter(Boolean).join(' · ')||'—'}</td><td>{r.supplier_name||'—'}</td><td>{r.avg_cost_per_observed_day==null?'Sin dato':new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(r.avg_cost_per_observed_day)}</td><td>{r.avg_observed_life_days==null?'Sin dato':`${Number(r.avg_observed_life_days).toFixed(0)} días`}</td><td>{r.failure_replacements||0}</td></tr>)}</tbody></table></CardContent></Card>
    </>}
  </div>;
}
