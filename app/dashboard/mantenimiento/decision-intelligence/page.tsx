'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CheckCircle2, CircleAlert, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type DecisionCase = {
  id:string; case_key:string; kind:string; asset_code:string|null; asset_name:string|null;
  urgency:'critical'|'high'|'medium'|'low'; canonical_fact:string; professional_interpretation:string;
  hypothesis_to_review:string|null; evidence_for:string[]; evidence_against:string[]; missing_evidence:string[];
  next_best_action:string; href:string; human_checkpoint:string; decision_state:'awaiting_human_review';
  accountable_role:string; evidence_status:'complete_for_review'|'evidence_gap'; evidence_count:number;
  execution_policy:'human_only'; impact:{baseline:string;expected:null;observed:null;status:'not_measured'};
};
type Response = {
  summary:{total:number;critical:number;high:number;hypotheses:number;operationalEvidenceAssets:number;reliabilityClosuresEligibleForLearning:number;reliabilityClosuresExcludedAsSyntheticOrNonOperational:number;awaitingHumanReview:number;evidenceGaps:number;impactMeasured:number};
  cases:DecisionCase[]; semantics:string; decision_case_policy:{execution:string;persistence:string;impact:string};
  learning_policy:{operational_reports:string;work_orders:string;human_authority:string};
};

const fetcher=async(url:string):Promise<Response>=>{
  const response=await fetch(url,{credentials:'include',cache:'no-store'});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error||'No fue posible cargar inteligencia de mantenimiento');
  return payload;
};
const urgencyLabel={critical:'Crítica',high:'Alta',medium:'Media',low:'Baja'} as const;
const urgencyVariant={critical:'destructive',high:'destructive',medium:'outline',low:'secondary'} as const;
const kindLabel:Record<string,string>={operational_signal:'Señal actual',observed_condition_pattern:'Patrón observado',preventive_due:'Preventivo',closure:'Cierre',reliability:'Confiabilidad'};

export default function MaintenanceDecisionIntelligencePage(){
  const {data,error,isLoading,mutate}=useSWR<Response>('/api/maintenance/decision-intelligence',fetcher,{revalidateOnFocus:false});
  if(error)return <StatePanel tone="error" title="No fue posible cargar Decision Intelligence" description={error.message} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/>;
  if(isLoading||!data)return <StatePanel tone="loading" title="Construyendo casos de decisión" description="Cruzando señales operacionales, preventivos, cierre y confiabilidad." className="min-h-0 py-5"/>;

  const cases=data.cases||[];
  const attention=data.summary.critical+data.summary.high;
  const firstCase=cases[0];

  return <div className="mx-auto w-full max-w-[1600px] space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Mantenimiento · Decision Intelligence</PageHeaderEyebrow>
        <PageHeaderTitle>Qué decisión necesita revisión humana ahora</PageHeaderTitle>
        <PageHeaderDescription>Ordena casos derivados de evidencia canónica. Cada caso separa hecho, interpretación, hipótesis, brecha de evidencia y próxima acción; la IA no aprueba, ejecuta ni cierra trabajo.</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions>
        <Button variant="outline" onClick={()=>void mutate()}><RefreshCw className="h-4 w-4"/>Actualizar</Button>
        {firstCase?<Button asChild><Link href={firstCase.href}>Revisar prioridad<ArrowRight className="h-4 w-4"/></Link></Button>:null}
      </PageHeaderActions>
    </PageHeader>

    <section aria-label="Estado de decisiones" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Casos abiertos" value={data.summary.awaitingHumanReview} detail="Esperan revisión humana"/>
      <Metric label="Atención alta" value={attention} detail={`${data.summary.critical} crítica(s)`}/>
      <Metric label="Brechas de evidencia" value={data.summary.evidenceGaps} detail="Falta comprobar antes de decidir"/>
      <Metric label="Impacto medido" value={data.summary.impactMeasured} detail="Sin beneficio atribuido por defecto"/>
    </section>

    <StatePanel tone="neutral" title="Frontera de confianza" description={`${data.semantics} La prioridad organiza atención; no representa probabilidad de falla ni reemplaza la decisión del responsable.`} className="min-h-0 py-5"/>

    <Card className="shadow-none">
      <CardHeader className="border-b pb-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-lg">Cola de decisión</CardTitle><CardDescription>Primero la decisión humana más urgente que cuenta con trazabilidad suficiente para ser revisada. Impacto permanece sin medir hasta registrar un resultado observado.</CardDescription></div><Badge variant="outline">{cases.length} casos</Badge></div></CardHeader>
      <CardContent className="p-0">{cases.length===0?<StatePanel tone="neutral" title="Sin casos pendientes" description="Las fuentes actuales no muestran señales que requieran revisión adicional." className="min-h-64 border-0 bg-transparent"/>:<div className="divide-y">{cases.map((decisionCase,index)=><DecisionRow key={decisionCase.case_key} decisionCase={decisionCase} index={index}/>)}</div>}</CardContent>
    </Card>

    <div className="grid gap-4 border-t pt-4 text-sm text-muted-foreground md:grid-cols-3" aria-label="Política de decisión">
      <Policy title="Ejecución" text="Sólo humana. El caso prepara evidencia y próxima acción; no autoriza trabajo."/>
      <Policy title="Aprendizaje" text={`${data.summary.reliabilityClosuresExcludedAsSyntheticOrNonOperational} cierre(s) UAT, simulados o no operacionales fueron excluidos del aprendizaje.`}/>
      <Policy title="Impacto" text="No se atribuye mejora hasta que un flujo autorizado registre un resultado observado comparable con la línea base."/>
    </div>
  </div>;
}

function DecisionRow({decisionCase,index}:{decisionCase:DecisionCase;index:number}){
  const hasGap=decisionCase.evidence_status==='evidence_gap';
  return <article className="grid gap-4 px-4 py-5 lg:grid-cols-[48px_minmax(0,1fr)_220px_44px] lg:items-start">
    <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-xs font-medium tabular-nums text-muted-foreground">{index+1}</div>
    <div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={urgencyVariant[decisionCase.urgency]}>{urgencyLabel[decisionCase.urgency]}</Badge><Badge variant="outline">{kindLabel[decisionCase.kind]||decisionCase.kind}</Badge>{decisionCase.asset_code?<Badge variant="outline">{decisionCase.asset_code}</Badge>:null}<span className="text-xs text-muted-foreground">{decisionCase.asset_name||'Activo no identificado'}</span></div><div><h2 className="text-sm font-semibold leading-6">{decisionCase.canonical_fact}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{decisionCase.professional_interpretation}</p></div><div className="grid gap-3 text-sm md:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Próxima acción</p><p className="mt-1 leading-5">{decisionCase.next_best_action}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Checkpoint humano</p><p className="mt-1 leading-5 text-muted-foreground">{decisionCase.human_checkpoint}</p></div></div>{decisionCase.hypothesis_to_review?<p className="border-l-2 pl-3 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Hipótesis a revisar:</span> {decisionCase.hypothesis_to_review}</p>:null}</div>
    <div className="space-y-3 text-xs"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/><div><p className="font-medium">Revisión humana</p><p className="text-muted-foreground">{decisionCase.accountable_role}</p></div></div><div className="flex items-center gap-2">{hasGap?<CircleAlert className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4"/>}<div><p className="font-medium">{hasGap?'Evidencia incompleta':'Lista para revisar'}</p><p className="text-muted-foreground">{decisionCase.evidence_count} evidencia(s) · {decisionCase.missing_evidence.length} pendiente(s)</p></div></div><div className="border-t pt-3"><p className="font-medium">Impacto aún no medido</p><p className="mt-1 text-muted-foreground">Línea base preservada; sin beneficio atribuido.</p></div></div>
    <Button asChild variant="ghost" size="icon-sm" aria-label="Abrir acción"><Link href={decisionCase.href}><ArrowRight className="h-4 w-4"/></Link></Button>
  </article>;
}
function Metric({label,value,detail}:{label:string;value:number;detail:string}){return <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p><p className="max-w-36 text-right text-xs leading-4 text-muted-foreground">{detail}</p></div></div>;}
function Policy({title,text}:{title:string;text:string}){return <div><p className="font-medium text-foreground">{title}</p><p className="mt-1 leading-5">{text}</p></div>;}
