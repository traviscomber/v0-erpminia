'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, BrainCircuit, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type Row = {
  id:string; asset_code:string|null; asset_name:string|null; urgency:'critical'|'high'|'medium'|'low';
  canonical_fact:string; professional_interpretation:string; hypothesis_to_review:string|null;
  evidence_for:string[]; evidence_against:string[]; missing_evidence:string[]; next_best_action:string; href:string; human_checkpoint:string;
};
type Response = { summary:{total:number;critical:number;high:number;hypotheses:number}; rows:Row[]; semantics:string };
const fetcher=async(url:string):Promise<Response>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar inteligencia de mantenimiento');return d;};
const urgencyLabel={critical:'Crítica',high:'Alta',medium:'Media',low:'Baja'} as const;
const urgencyVariant={critical:'destructive',high:'destructive',medium:'outline',low:'secondary'} as const;

export default function MaintenanceDecisionIntelligencePage(){
  const {data,error,isLoading}=useSWR<Response>('/api/maintenance/decision-intelligence',fetcher,{revalidateOnFocus:false});
  if(error)return <StatePanel tone="error" title="No fue posible cargar Decision Intelligence" description={error.message} className="min-h-0 py-5"/>;
  if(isLoading||!data)return <StatePanel tone="loading" title="Construyendo decisiones" description="Cruzando señales operacionales, preventivos, cierre y confiabilidad." className="min-h-0 py-5"/>;

  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Mantenimiento · Decision Intelligence</PageHeaderEyebrow><PageHeaderTitle>De evidencia a decisión de mantenimiento</PageHeaderTitle><PageHeaderDescription>Dato canónico → interpretación profesional → hipótesis revisable → evidencia faltante → próxima acción → validación humana.</PageHeaderDescription></PageHeaderContent></PageHeader>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">{[['Decisiones',data.summary.total],['Críticas',data.summary.critical],['Alta prioridad',data.summary.high],['Hipótesis',data.summary.hypotheses]].map(([label,value])=><div key={String(label)} className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</section>
    <StatePanel tone="neutral" title="Frontera de confianza" description={data.semantics} className="min-h-0 py-5"/>

    <div className="space-y-4">{data.rows.length===0?<StatePanel title="Sin decisiones pendientes" description="Las fuentes actuales no muestran señales que requieran revisión adicional." className="min-h-0 py-5"/>:data.rows.map((row,index)=><Card key={row.id}>
      <CardHeader><div className="flex flex-wrap items-center gap-2"><span className="text-xs tabular-nums text-muted-foreground">#{index+1}</span><Badge variant={urgencyVariant[row.urgency]}>{urgencyLabel[row.urgency]}</Badge>{row.asset_code?<Badge variant="outline">{row.asset_code}</Badge>:null}</div><CardTitle className="text-base">{row.canonical_fact}</CardTitle><CardDescription>{row.asset_name||'Activo no identificado'}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-lg border p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/><p className="text-sm font-medium">Interpretación profesional</p></div><p className="mt-2 text-sm text-muted-foreground">{row.professional_interpretation}</p></section><section className="rounded-lg border p-4"><div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4"/><p className="text-sm font-medium">Hipótesis a revisar</p></div><p className="mt-2 text-sm text-muted-foreground">{row.hypothesis_to_review||'No requiere hipótesis: existe un requisito operacional explícito por resolver.'}</p></section></div>
        <div className="grid gap-4 lg:grid-cols-3"><section><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">A favor</p><div className="mt-2 space-y-1 text-sm">{row.evidence_for.length?row.evidence_for.map(x=><p key={x}>• {x}</p>):<p className="text-muted-foreground">Sin evidencia adicional.</p>}</div></section><section><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">En contra</p><div className="mt-2 space-y-1 text-sm">{row.evidence_against.length?row.evidence_against.map(x=><p key={x}>• {x}</p>):<p className="text-muted-foreground">Aún no registrada.</p>}</div></section><section><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Falta comprobar</p><div className="mt-2 space-y-1 text-sm">{row.missing_evidence.map(x=><p key={x}>• {x}</p>)}</div></section></div>
        <section className="rounded-lg border bg-muted/20 p-4"><div className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4"/><div><p className="text-sm font-medium">Próxima mejor acción</p><p className="mt-1 text-sm">{row.next_best_action}</p><p className="mt-2 text-xs text-muted-foreground">Checkpoint humano: {row.human_checkpoint}</p></div></div></section>
        <div className="flex justify-end"><Button asChild><Link href={row.href}>Abrir acción<ArrowRight className="h-4 w-4"/></Link></Button></div>
      </CardContent>
    </Card>)}</div>
  </div>;
}
