'use client';

import useSWR from 'swr';

 type ReviewItem = {
  review_id:string|null;
  source_report_id:string;
  canonical_asset_id:string;
  asset_code:string|null;
  asset_name:string|null;
  operation_date:string;
  review_reason:'out_of_service'|'operational_with_observations'|'machine_observation';
  equipment_status_raw:string|null;
  machine_observations:string|null;
  review_status:'pending'|'accepted'|'dismissed'|'work_order_created';
  linked_work_order_id:string|null;
  has_linked_work_order:boolean;
};

type Response={items:ReviewItem[];canWrite:boolean;error?:string};

const fetcher=async(url:string):Promise<Response>=>{
  const response=await fetch(url,{credentials:'include',cache:'no-store'});
  const json=await response.json();
  if(!response.ok)throw new Error(json.error||'No se pudo cargar la revisión operacional');
  return json;
};

const date=(value:string)=>new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
const label=(reason:ReviewItem['review_reason'])=>reason==='out_of_service'?'Fuera de servicio':reason==='operational_with_observations'?'Operativo con observaciones':'Observación mecánica';

export function MaintenanceReviewStrip(){
  const {data,error,isLoading,mutate}=useSWR<Response>('/api/mining-os/maintenance-review-queue',fetcher,{revalidateOnFocus:false});
  const update=async(reviewId:string,status:'accepted'|'dismissed')=>{
    const response=await fetch('/api/mining-os/maintenance-review-queue',{method:'PATCH',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({reviewId,status})});
    if(response.ok)await mutate();
  };

  if(isLoading)return <section className="rounded-xl border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">Cargando revisión Sondaje → Mantención…</section>;
  if(error||!data)return <section className="rounded-xl border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">Revisión operacional no disponible.</section>;

  const active=(data.items||[]).filter(item=>item.review_status==='pending'||item.review_status==='accepted');
  return <section className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-5">
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Sondaje → Mantención</p>
      <h2 className="text-lg font-medium">Revisión operacional</h2>
      <p className="mt-1 text-sm text-muted-foreground">Último parte por perforadora. La evidencia puede requerir revisión humana; Motil no crea OT automáticamente.</p>
    </div>
    {active.length===0?<p className="text-sm text-muted-foreground">Sin revisiones operacionales pendientes en el último parte de cada equipo.</p>:
      <div className="grid gap-3 lg:grid-cols-2">
        {active.map(item=><article key={item.review_id||`${item.source_report_id}:${item.review_reason}`} className="rounded-lg border border-border/50 bg-background/35 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.asset_name||item.asset_code||'Equipo'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label(item.review_reason)} · {date(item.operation_date)}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{item.review_status==='accepted'?'Aceptado':'Pendiente'}</span>
          </div>
          {item.machine_observations?<p className="mt-3 text-sm">{item.machine_observations}</p>:<p className="mt-3 text-sm text-muted-foreground">Sin observación mecánica textual en el parte.</p>}
          {item.has_linked_work_order?<p className="mt-3 text-xs text-muted-foreground">OT vinculada.</p>:<p className="mt-3 text-xs text-muted-foreground">Sin OT vinculada. Requiere decisión humana.</p>}
          {data.canWrite&&item.review_id&&item.review_status==='pending'?<div className="mt-4 flex gap-2">
            <button type="button" onClick={()=>update(item.review_id!,'accepted')} className="rounded-md border border-border px-3 py-1.5 text-xs">Aceptar revisión</button>
            <button type="button" onClick={()=>update(item.review_id!,'dismissed')} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">Descartar</button>
          </div>:null}
        </article>)}
      </div>}
  </section>;
}
