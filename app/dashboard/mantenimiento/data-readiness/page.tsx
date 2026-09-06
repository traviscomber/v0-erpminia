'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CheckCircle2, Database, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type Row = { id:string; asset_code:string|null; name:string|null; readiness:'complete'|'usable'|'needs_validation'; missing:string[]; essential_missing:string[]; source_ref:string|null; validation_status:string|null };
type Payload = { summary:{ total:number; complete:number; usable:number; needs_validation:number; missing_asset_type:number; missing_criticality:number; missing_operational_status:number; missing_location:number }; rows:Row[]; semantics:string; policy:string };
const fetcher=async(url:string):Promise<Payload>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar completitud');return d;};

export default function MaintenanceDataReadinessPage(){
 const {data,error,isLoading}=useSWR<Payload>('/api/maintenance/data-readiness',fetcher,{revalidateOnFocus:false});
 if(error)return <StatePanel tone="error" title="No fue posible cargar completitud de activos" description={error.message}/>;
 if(isLoading||!data)return <StatePanel tone="loading" title="Auditando activos canónicos" description="Separando dato completo, utilizable y pendiente de validación."/>;
 const s=data.summary;
 return <div className="space-y-6">
  <PageHeader><PageHeaderContent><PageHeaderEyebrow>Mantenimiento · calidad de datos</PageHeaderEyebrow><PageHeaderTitle>Readiness canónico de activos</PageHeaderTitle><PageHeaderDescription>Antes de usar IA o priorización avanzada, MOTIL muestra qué atributos de cada activo están realmente materializados y cuáles requieren validación humana.</PageHeaderDescription></PageHeaderContent></PageHeader>

  <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">{[
   ['Activos canónicos',s.total,Database],['Listos',s.complete+s.usable,CheckCircle2],['Requieren validación',s.needs_validation,TriangleAlert],['Sin criticidad',s.missing_criticality,ShieldCheck]
  ].map(([label,value,Icon]:any)=><div key={label} className="bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</section>

  <Card><CardHeader><CardTitle>Brechas que limitan inteligencia</CardTitle><CardDescription>No son datos “estimables”: requieren evidencia o validación responsable.</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
   ['Tipo de activo',s.missing_asset_type],['Criticidad',s.missing_criticality],['Estado operacional',s.missing_operational_status],['Ubicación',s.missing_location]
  ].map(([label,value])=><div key={String(label)} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div></CardContent></Card>

  <StatePanel tone="neutral" title="Frontera de confianza" description={`${data.semantics} ${data.policy}`} className="min-h-0 py-5"/>

  <Card><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Cola de enriquecimiento</CardTitle><CardDescription>Prioriza activos con campos esenciales faltantes antes de usar criticidad o estado para decisiones.</CardDescription></div><Badge variant="outline">{data.rows.length}</Badge></div></CardHeader><CardContent className="divide-y rounded-lg border">{data.rows.slice(0,80).map(row=><div key={row.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1.3fr_auto] md:items-center"><div><p className="font-medium">{row.asset_code?`${row.asset_code} · `:''}{row.name||'Activo sin nombre'}</p><p className="mt-1 text-xs text-muted-foreground">{row.source_ref||'Sin referencia fuente visible'}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Falta validar</p><p className="mt-1 text-sm">{row.missing.join(' · ')}</p></div><Button asChild variant="outline" size="sm"><Link href={`/dashboard/mantenimiento/equipos/${row.id}`}>Abrir ficha<ArrowRight className="h-4 w-4"/></Link></Button></div>)}</CardContent></Card>
 </div>;
}
