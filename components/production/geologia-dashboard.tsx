'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Drill, ExternalLink, Gem, MapPinned, Mountain, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type GeologyData = {
  canWrite: boolean;
  summary: { mines:number; sectors:number; drillingReports:number; drilledMeters:number; mineLinkCoveragePct:number; sectorLinkCoveragePct:number; holeLinkCoveragePct:number };
  mines: Array<{ id:string; code:string|null; name:string; status:string|null; sectors:number; drillingReports:number; drilledMeters:number }>;
  recentDrilling: Array<{ id:string; operation_date:string|null; hole_code_raw:string|null; mine_raw:string|null; sector_raw:string|null; drilled_meters:number|null; reconciliation_status:string|null; canonical_mine_source_id:string|null; canonical_mine_sector_id:string|null; canonical_drill_hole_id:string|null }>;
  intelligenceStatus: { geologicalSamplesCanonical:boolean; assaysCanonical:boolean; drillHolesCanonical:boolean; note:string };
  externalContext: { authority:string; treatment:string; sources:Array<{ key:string; name:string; status:string; referenceDate?:string; url:string; use:string }> };
};

const fetcher = async (url:string):Promise<GeologyData> => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar Geología');
  return data;
};

function pct(value:number){return `${value.toLocaleString('es-CL',{maximumFractionDigits:1})}%`;}
function meters(value:number){return `${value.toLocaleString('es-CL',{maximumFractionDigits:0})} m`;}

export function GeologiaDashboard(){
  const { data, error, isLoading, mutate } = useSWR('/api/produccion/geologia', fetcher);
  const [selectedMines,setSelectedMines] = useState<Record<string,string>>({});
  const [savingId,setSavingId] = useState<string|null>(null);
  const s = data?.summary;

  async function assignMine(reportId:string){
    const mineId=selectedMines[reportId];
    if(!mineId)return;
    setSavingId(reportId);
    try{
      const response=await fetch('/api/produccion/geologia',{method:'PATCH',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({reportId,mineId})});
      const result=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(result?.error||'No fue posible asignar la mina');
      toast.success(`Registro reconciliado con ${result.mine.name}`);
      setSelectedMines(current=>{const next={...current};delete next[reportId];return next;});
      await mutate();
    }catch(reason){toast.error(reason instanceof Error?reason.message:'No fue posible asignar la mina');}
    finally{setSavingId(null);}
  }

  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · Inteligencia geológica</PageHeaderEyebrow><PageHeaderTitle>Geología</PageHeaderTitle><PageHeaderDescription>Conecta maestros internos de mina/sector, evidencia de sondaje y contexto público SERNAGEOMIN sin mezclar fuentes ni inferir geología inexistente.</PageHeaderDescription></PageHeaderContent></PageHeader>

    {error ? <StatePanel tone="error" title="No fue posible cargar Geología" description="Reintenta la consulta." actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/> : null}

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen geológico">
      {[
        {label:'Minas canónicas',value:s?.mines ?? '—',detail:'Maestro interno',icon:Mountain},
        {label:'Sectores canónicos',value:s?.sectors ?? '—',detail:'Base para reconciliación espacial',icon:MapPinned},
        {label:'Sondajes con evidencia',value:s?.drillingReports ?? '—',detail:s ? meters(s.drilledMeters) : '—',icon:Drill},
        {label:'Cobertura mina',value:s ? pct(s.mineLinkCoveragePct) : '—',detail:s ? `Sector ${pct(s.sectorLinkCoveragePct)} · Pozo ${pct(s.holeLinkCoveragePct)}` : '—',icon:Network},
      ].map((m)=>{const Icon=m.icon;return <div key={m.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{m.label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading?'—':m.value}</p><p className="mt-1 text-xs text-muted-foreground">{m.detail}</p></div>})}
    </section>

    {data ? <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Límite actual de inteligencia geológica</p><p className="mt-1 text-muted-foreground">{data.intelligenceStatus.note}</p></div></div> : null}

    {data ? <section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Cobertura por mina</p><p className="mt-1 text-sm text-muted-foreground">Maestros internos y evidencia de sondaje ya reconciliada.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Mina</th><th className="px-4 py-3 text-right">Sectores</th><th className="px-4 py-3 text-right">Reportes sondaje</th><th className="px-4 py-3 text-right">Metros</th></tr></thead><tbody className="divide-y">{data.mines.map((m)=><tr key={m.id}><td className="px-4 py-3"><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.code || 'Sin código'} · {m.status || 'Sin estado'}</p></td><td className="px-4 py-3 text-right tabular-nums">{m.sectors.toLocaleString('es-CL')}</td><td className="px-4 py-3 text-right tabular-nums">{m.drillingReports.toLocaleString('es-CL')}</td><td className="px-4 py-3 text-right tabular-nums">{meters(m.drilledMeters)}</td></tr>)}</tbody></table></div></section> : null}

    {data ? <section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><div className="flex items-center gap-2"><Gem className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Contexto externo SERNAGEOMIN</p></div><p className="mt-1 text-sm text-muted-foreground">Fuente pública de contexto. No reemplaza la verdad operacional interna.</p></div><div className="divide-y">{data.externalContext.sources.map((source)=><a key={source.key} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/30"><div><p className="font-medium">{source.name}</p><p className="mt-1 text-sm text-muted-foreground">{source.use}</p>{source.referenceDate?<p className="mt-1 text-xs text-muted-foreground">Referencia: {source.referenceDate}</p>:null}</div><ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/></a>)}</div></section> : null}

    {data ? <section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Evidencia reciente de sondaje</p><p className="mt-1 text-sm text-muted-foreground">Pedro puede asignar la mina canónica. Sector y pozo permanecen pendientes hasta contar con evidencia.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Pozo</th><th className="px-4 py-3">Mina / sector fuente</th><th className="px-4 py-3 text-right">Metros</th><th className="px-4 py-3">Reconciliación</th>{data.canWrite?<th className="px-4 py-3">Asignar mina</th>:null}</tr></thead><tbody className="divide-y">{data.recentDrilling.map((r)=><tr key={r.id}><td className="px-4 py-3 whitespace-nowrap">{r.operation_date || '—'}</td><td className="px-4 py-3">{r.hole_code_raw || '—'}</td><td className="px-4 py-3"><p>{r.mine_raw && r.mine_raw !== '#ERROR!' ? r.mine_raw : 'Sin mina en fuente'}</p><p className="text-xs text-muted-foreground">{r.sector_raw || 'Sin sector fuente'}</p></td><td className="px-4 py-3 text-right tabular-nums">{Number(r.drilled_meters || 0).toLocaleString('es-CL',{maximumFractionDigits:1})}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.canonical_mine_source_id?'Mina ✓':'Mina pendiente'} · {r.canonical_mine_sector_id?'Sector ✓':'Sector pendiente'} · {r.canonical_drill_hole_id?'Pozo ✓':'Pozo pendiente'}</td>{data.canWrite?<td className="min-w-[280px] px-4 py-3"><div className="flex items-center gap-2"><Select value={selectedMines[r.id]||''} onValueChange={(value)=>setSelectedMines(current=>({...current,[r.id]:value}))}><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar mina"/></SelectTrigger><SelectContent>{data.mines.map(m=><SelectItem key={m.id} value={m.id}>{m.name}{m.code?` · ${m.code}`:''}</SelectItem>)}</SelectContent></Select><Button size="sm" disabled={!selectedMines[r.id]||savingId===r.id} onClick={()=>void assignMine(r.id)}>{savingId===r.id?'Guardando…':'Asignar'}</Button></div></td>:null}</tr>)}</tbody></table></div></section> : null}
  </div>;
}
