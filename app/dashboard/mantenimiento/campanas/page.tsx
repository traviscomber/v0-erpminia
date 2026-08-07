'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, CheckCircle2, RefreshCw, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type Campaign = {
  id: string; name: string; campaign_type: string; status: string; start_date: string; end_date: string; scope?: string | null;
  workOrderCount: number; completedCount: number; blockedCount: number; shortageCount: number; realCost: number; progress: number;
};
type WorkOrder = {
  id: string; linkId?: string; work_order_number?: string | null; title?: string | null; status?: string | null; priority?: string | null;
  planned_start_date?: string | null; planned_end_date?: string | null; assigned_to_name?: string | null; sequence_no?: number;
  asset?: { asset_code?: string | null; name?: string | null } | null; cost?: { total_cost?: number | null } | null;
  blockedBy?: string[]; materialShortages?: number; resourceConflicts?: number;
};
type Material = { id: string; work_order_id: string; quantity_required: number; quantity_available: number; quantity_shortage: number; product?: { product_code?: string | null; name?: string | null; unit?: string | null } | null };
type Dependency = { id: string; predecessor_work_order_id: string; successor_work_order_id: string };
type Data = { campaigns: Campaign[]; selected: Campaign | null; workOrders: WorkOrder[]; dependencies: Dependency[]; materials: Material[]; conflicts: Array<{ type: string; workOrderId: string; detail: string }>; eligibleWorkOrders: WorkOrder[] };

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function CampaignsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [campaignType, setCampaignType] = useState('shutdown');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scope, setScope] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');

  const load = async (campaignId?: string) => {
    setLoading(true);
    const suffix = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
    const response = await fetch(`/api/maintenance/campaigns${suffix}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setData(payload);
      const nextId = payload?.selected?.id || '';
      setSelectedId(nextId);
    } else setMessage(payload?.error || 'No se pudo cargar la información.');
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const post = async (body: Record<string, unknown>) => {
    setWorking(true); setMessage('');
    const response = await fetch('/api/maintenance/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => null);
    setWorking(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo completar la acción.'); return false; }
    return payload;
  };

  const createCampaign = async () => {
    const result = await post({ action: 'create_campaign', name, campaignType, startDate, endDate, scope });
    if (!result) return;
    setName(''); setScope('');
    await load(result.campaign?.id);
  };

  const addWorkOrder = async () => {
    if (!data?.selected) return;
    const ok = await post({ action: 'add_work_order', campaignId: data.selected.id, workOrderId, plannedStartDate, plannedEndDate });
    if (!ok) return;
    setWorkOrderId(''); setPlannedStartDate(''); setPlannedEndDate('');
    await load(data.selected.id);
  };

  const addDependency = async () => {
    if (!data?.selected) return;
    const ok = await post({ action: 'add_dependency', campaignId: data.selected.id, predecessorWorkOrderId: predecessorId, successorWorkOrderId: successorId });
    if (!ok) return;
    setPredecessorId(''); setSuccessorId('');
    await load(data.selected.id);
  };

  const shortageProducts = useMemo(() => (data?.materials || []).filter((row) => Number(row.quantity_shortage || 0) > 0), [data]);
  const orderLabel = (id: string) => {
    const row = data?.workOrders.find((item) => item.id === id);
    return row ? `${row.work_order_number || 'OT'} · ${row.title || 'Sin título'}` : id;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mantenimiento</p>
          <h1 className="mt-1 text-3xl font-bold">Paradas y campañas</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">Agrupa OT existentes, ordena dependencias y controla recursos, materiales, avance y costo sin duplicar registros.</p>
        </div>
        <Button variant="outline" onClick={() => load(selectedId)} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button>
      </div>

      {message ? <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</div> : null}

      <Card>
        <CardHeader><CardTitle className="text-base">Nueva campaña</CardTitle><CardDescription>Define únicamente el marco de planificación. Las OT siguen siendo las OT originales.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <Input className="md:col-span-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={campaignType} onChange={(e) => setCampaignType(e.target.value)}><option value="shutdown">Parada mayor</option><option value="campaign">Campaña</option></select>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button onClick={createCampaign} disabled={working || !name || !startDate || !endDate}>Crear</Button>
          <Input className="md:col-span-6" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Alcance operacional (opcional)" />
        </CardContent>
      </Card>

      {(data?.campaigns || []).length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data!.campaigns.map((campaign) => (
            <button key={campaign.id} onClick={() => load(campaign.id)} className={`rounded-lg border p-4 text-left transition-colors ${selectedId === campaign.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{campaign.name}</p><p className="mt-1 text-xs text-muted-foreground">{campaign.start_date} → {campaign.end_date}</p></div><Badge variant="outline">{campaign.status}</Badge></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span>{campaign.workOrderCount} OT</span><span>{campaign.progress}% avance</span><span>{money.format(Number(campaign.realCost || 0))}</span></div>
            </button>
          ))}
        </div>
      ) : null}

      {data?.selected ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Avance</p><p className="mt-1 text-2xl font-bold">{data.selected.progress}%</p><p className="text-xs text-muted-foreground">{data.selected.completedCount} de {data.selected.workOrderCount} OT cerradas</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Bloqueos</p><p className="mt-1 text-2xl font-bold">{data.selected.blockedCount + data.conflicts.length}</p><p className="text-xs text-muted-foreground">Dependencias y recursos</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Faltantes</p><p className="mt-1 text-2xl font-bold">{data.selected.shortageCount}</p><p className="text-xs text-muted-foreground">Requerimientos con déficit</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Costo real</p><p className="mt-1 text-2xl font-bold">{money.format(Number(data.selected.realCost || 0))}</p><p className="text-xs text-muted-foreground">Desde costos de OT</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Agregar OT existente</CardTitle><CardDescription>La OT se vincula a la campaña; no se copia ni se recrea.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <select className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-2" value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)}><option value="">Seleccionar OT</option>{data.eligibleWorkOrders.map((row) => <option key={row.id} value={row.id}>{row.work_order_number || 'OT'} · {row.title}</option>)}</select>
              <Input type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} />
              <Input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
              <Button className="md:col-start-4" onClick={addWorkOrder} disabled={working || !workOrderId}>Agregar OT</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Órdenes de la campaña</CardTitle><CardDescription>Estado, dependencia, recursos, materiales y costo provienen de las fuentes operacionales vigentes.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 pr-3">OT</th><th className="pr-3">Plan</th><th className="pr-3">Equipo</th><th className="pr-3">Responsable</th><th className="pr-3">Estado</th><th className="pr-3">Bloqueos</th><th className="pr-3">Faltantes</th><th className="text-right">Costo</th></tr></thead><tbody>
                {data.workOrders.map((row) => <tr key={row.id} className="border-b align-top"><td className="py-3 pr-3"><p className="font-medium">{row.work_order_number || 'OT'}</p><p className="text-xs text-muted-foreground">{row.title}</p></td><td className="pr-3">{row.planned_start_date || 'Sin fecha'}{row.planned_end_date ? ` → ${row.planned_end_date}` : ''}</td><td className="pr-3">{row.asset?.asset_code || row.asset?.name || '—'}</td><td className="pr-3">{row.assigned_to_name || 'Sin asignar'}</td><td className="pr-3"><Badge variant="outline">{row.status || '—'}</Badge></td><td className="pr-3">{(row.blockedBy?.length || 0) + (row.resourceConflicts || 0)}</td><td className="pr-3">{row.materialShortages || 0}</td><td className="text-right">{money.format(Number(row.cost?.total_cost || 0))}</td></tr>)}
              </tbody></table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarRange className="h-4 w-4" />Dependencias</CardTitle><CardDescription>Una OT sucesora queda bloqueada mientras su predecesora no esté cerrada.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={predecessorId} onChange={(e) => setPredecessorId(e.target.value)}><option value="">Predecesora</option>{data.workOrders.map((row) => <option key={row.id} value={row.id}>{row.work_order_number || 'OT'}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={successorId} onChange={(e) => setSuccessorId(e.target.value)}><option value="">Sucesora</option>{data.workOrders.map((row) => <option key={row.id} value={row.id}>{row.work_order_number || 'OT'}</option>)}</select></div><Button onClick={addDependency} disabled={working || !predecessorId || !successorId}>Guardar dependencia</Button>{data.dependencies.length ? <div className="space-y-2">{data.dependencies.map((dep) => <div key={dep.id} className="rounded-md border p-3 text-sm">{orderLabel(dep.predecessor_work_order_id)} → {orderLabel(dep.successor_work_order_id)}</div>)}</div> : <p className="text-sm text-muted-foreground">Sin dependencias registradas.</p>}</CardContent></Card>

            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" />Recursos y materiales</CardTitle><CardDescription>Solo se muestran conflictos y faltantes comprobados.</CardDescription></CardHeader><CardContent className="space-y-3">{data.conflicts.length ? data.conflicts.map((row, index) => <div key={`${row.workOrderId}-${index}`} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-medium">{orderLabel(row.workOrderId)}</p><p className="text-amber-900">{row.detail}</p></div>) : <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" />Sin conflictos de recursos detectados.</div>}{shortageProducts.length ? shortageProducts.map((row) => <div key={row.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{row.product?.product_code || ''} {row.product?.name || 'Producto'}</p><p className="text-muted-foreground">Requerido {row.quantity_required} · disponible {row.quantity_available} · faltante {row.quantity_shortage} {row.product?.unit || ''}</p></div>) : <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wrench className="h-4 w-4" />Sin faltantes de material registrados.</div>}</CardContent></Card>
          </div>
        </>
      ) : loading ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Cargando...</CardContent></Card> : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No hay campañas creadas.</CardContent></Card>}
    </div>
  );
}
