'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CheckCircle2, Link2, PackageSearch, ShoppingCart, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url:string) => { const r=await fetch(url,{credentials:'include',cache:'no-store'}); const j=await r.json().catch(()=>null); if(!r.ok) throw new Error(j?.error||'No se pudo cargar la cadena'); return j; };

const stepLabel: Record<string,string> = { work_order:'Falta OT', materials:'Falta evidencia de repuestos', supply_need:'Falta necesidad de abastecimiento', procurement_request:'Falta promoción a Compras', purchase_order:'Falta OC', receipt:'Falta recepción', resolved:'Sin corte abierto' };

export default function RootCausePage(){
 const {data,error,isLoading}=useSWR('/api/intelligence/root-cause',fetcher,{revalidateOnFocus:false});
 const s=data?.summary;
 if(error) return <StatePanel tone="error" title="Cadena transversal no disponible" description={error.message}/>;
 return <div className="space-y-6">
  <section className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Gerencia · causa raíz transversal</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Cadena de evidencia operacional</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Sigue una observación desde Producción/Sondaje hasta Mantención, repuestos, Compras y recepción. Cada salto requiere un vínculo canónico explícito.</p></div><Button asChild variant="outline"><Link href="/dashboard/decisiones">Volver a decisiones</Link></Button></section>
  <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-6">{[
   ['Observaciones',s?.operationalObservations,Link2],['Con OT',s?.linkedToWorkOrder,Wrench],['Con repuestos',s?.withMaterialEvidence,PackageSearch],['Con abastecimiento',s?.withSupplyNeed,PackageSearch],['En Compras',s?.inProcurement,ShoppingCart],['Con OC',s?.withPurchaseOrder,ShoppingCart]
  ].map(([label,value,Icon]:any)=><div key={label} className="bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold">{isLoading?'—':Number(value||0).toLocaleString('es-CL')}</p></div>)}</section>
  <Card><CardHeader><CardTitle>Casos trazables</CardTitle></CardHeader><CardContent className="space-y-3">{isLoading?<StatePanel tone="loading" title="Construyendo cadena"/>:(data?.chains||[]).length===0?<div className="flex items-center gap-3 py-6"><CheckCircle2 className="h-5 w-5"/><p className="text-sm">No hay observaciones operacionales abiertas para encadenar.</p></div>:(data?.chains||[]).map((row:any)=><div key={row.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{row.assetCode||'Equipo'}</Badge><Badge variant={row.breakAt==='resolved'?'secondary':'destructive'}>{stepLabel[row.breakAt]||row.breakAt}</Badge></div><p className="mt-2 font-medium">{row.assetName||row.assetCode||'Activo'}</p><p className="mt-1 text-sm text-muted-foreground">{row.observation||'Sin observación textual'}</p><p className="mt-2 text-sm">Acción: {row.action}</p></div><div className="min-w-[240px] text-xs text-muted-foreground"><p>OT: {row.workOrder?`${row.workOrder.number} · ${row.workOrder.status}`:'sin vínculo'}</p><p>Repuestos: {row.materials.count} línea(s), faltante {Number(row.materials.shortage||0).toLocaleString('es-CL')}</p><p>Compras: {row.procurement?row.procurement.requestNumber:'sin solicitud'}</p><p>OC: {row.purchaseOrders.length}</p></div></div>{row.workOrder?<Button asChild size="sm" variant="outline" className="mt-3"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${row.workOrder.id}`}>Abrir OT <ArrowRight className="ml-2 h-4 w-4"/></Link></Button>:null}</div>)}</CardContent></Card>
  <p className="text-xs text-muted-foreground">Regla: {data?.policy}</p>
 </div>;
}
