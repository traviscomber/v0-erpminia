'use client';

import useSWR from 'swr';

type Rolling = {
  assetId:string;
  assetCode:string|null;
  assetName:string|null;
  windowStart:string;
  windowEnd:string;
  sourceCoverage:{costThrough:string|null;drillingThrough:string|null};
  costEvents:number|null;
  costClp:number|null;
  drillingReports:number|null;
  drilledMeters:number|null;
  costClpPerMeter:number|null;
  evidenceStatus:string;
};

type Response={rolling90d:Rolling[];evidencePolicy?:Record<string,boolean>;error?:string};

const fetcher=async(url:string):Promise<Response>=>{
  const response=await fetch(url,{credentials:'include',cache:'no-store'});
  const json=await response.json();
  if(!response.ok)throw new Error(json.error||'No se pudo cargar economía de sondaje');
  return json;
};

const clp=(value:number|null)=>value==null?'—':new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
const num=(value:number|null,digits=0)=>value==null?'—':value.toLocaleString('es-CL',{maximumFractionDigits:digits});
const date=(value:string|null)=>value?new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`)):'—';

export function DrillingEconomicsStrip(){
  const {data,error,isLoading}=useSWR<Response>('/api/mining-os/drilling-economics?months=6',fetcher,{revalidateOnFocus:false});
  if(isLoading)return <section className="rounded-xl border border-border/60 bg-card/40 p-5"><div className="text-sm text-muted-foreground">Cargando economía comparable de sondaje…</div></section>;
  if(error||!data)return <section className="rounded-xl border border-border/60 bg-card/40 p-5"><div className="text-sm text-muted-foreground">Economía de sondaje no disponible.</div></section>;

  const comparable=(data.rolling90d||[]).filter(row=>row.evidenceStatus==='comparable_at_common_cut'&&row.costClpPerMeter!=null);
  const cut=comparable.length?comparable.reduce((latest,row)=>!latest||row.windowEnd>latest?row.windowEnd:latest,''):null;

  return <section className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-5">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Economía de sondaje</p>
        <h2 className="text-lg font-medium">Costo por metro · 90 días comparables</h2>
      </div>
      <p className="text-xs text-muted-foreground">Corte común: {date(cut)}</p>
    </div>
    {comparable.length===0?<p className="text-sm text-muted-foreground">Sin una ventana común suficiente entre costos y metros perforados.</p>:
      <div className="grid gap-3 lg:grid-cols-5">
        {comparable.map(row=><article key={row.assetId} className="min-w-0 rounded-lg border border-border/50 bg-background/35 p-4">
          <p className="truncate text-sm font-medium">{row.assetName||row.assetCode||'Perforadora'}</p>
          <p className="mt-3 text-xl font-semibold tabular-nums">{clp(row.costClpPerMeter)}<span className="ml-1 text-xs font-normal text-muted-foreground">/m</span></p>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>{num(row.drilledMeters,1)} m perforados</p>
            <p>{clp(row.costClp)} costo observado</p>
            <p>{date(row.windowStart)} → {date(row.windowEnd)}</p>
          </div>
        </article>)}
      </div>}
    <p className="text-xs text-muted-foreground">Sólo compara costo y producción dentro de la misma ventana temporal. No clasifica desempeño ni completa períodos sin evidencia.</p>
  </section>;
}
