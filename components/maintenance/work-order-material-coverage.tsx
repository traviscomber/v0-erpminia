'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, PackageCheck, PackageSearch, Plus, ShoppingCart, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la cobertura de materiales');
  return payload;
};

type MaterialRow = {
  requirement_id?: string | null;
  product_id?: string | null;
  product_code?: string | null;
  product_name?: string | null;
  required?: number | string | null;
  available?: number | string | null;
  shortage?: number | string | null;
  status?: string | null;
  id?: string | null;
  quantity_required?: number | string | null;
  quantity_available?: number | string | null;
  quantity_shortage?: number | string | null;
};

type CatalogRow = {
  productId: string;
  productCode: string | null;
  productName: string | null;
  family: string | null;
  unit: string | null;
  quantityAvailable: number;
  warehouses: string[];
};

type SupplyStatus = {
  supply_need_id?: string | null;
  procurement_request_id?: string | null;
  supply_status?: string | null;
  materials?: MaterialRow[] | null;
};

const required = (row: MaterialRow) => Number(row.required ?? row.quantity_required ?? 0);
const available = (row: MaterialRow) => Number(row.available ?? row.quantity_available ?? 0);
const shortage = (row: MaterialRow) => Number(row.shortage ?? row.quantity_shortage ?? 0);
const rowKey = (row: MaterialRow) => row.requirement_id || row.id || row.product_id || `${row.product_code}-${row.product_name}`;

export function WorkOrderMaterialCoverage({ workOrderId }: { workOrderId: string }) {
  const { data, error, isLoading, mutate } = useSWR(`/api/maintenance/work-orders/${workOrderId}/materials`, fetcher);
  const [issuing, setIssuing] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogRow | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const status = (data?.data || data || {}) as SupplyStatus;
  const rows = Array.isArray(status.materials) ? status.materials : [];
  const shortageCount = rows.filter((row) => shortage(row) > 0).length;
  const availableCount = rows.filter((row) => available(row) > 0).length;
  const alreadySent = Boolean(status.procurement_request_id) || ['sent_to_procurement', 'partially_covered', 'covered'].includes(status.supply_status || '');
  const catalogKey = query.trim().length >= 2 ? `/api/maintenance/material-catalog?q=${encodeURIComponent(query.trim())}` : null;
  const { data: catalogData, isLoading: catalogLoading } = useSWR<{ rows: CatalogRow[] }>(catalogKey, fetcher, { revalidateOnFocus: false });
  const catalogRows = useMemo(() => (catalogData?.rows || []).filter((item) => !rows.some((row) => row.product_id === item.productId)), [catalogData, rows]);

  const resetEditor = () => {
    setAdding(false);
    setQuery('');
    setSelected(null);
    setQuantity('1');
  };

  const addMaterial = async () => {
    const requested = Number(quantity);
    if (!selected || !Number.isFinite(requested) || requested <= 0) return;
    setSaving(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/materials`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalProductId: selected.productId, quantityRequired: requested }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo agregar el material');
      setActionMessage(`${selected.productCode || selected.productName || 'Material'} agregado al requerimiento.`);
      resetEditor();
      await mutate();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'No se pudo agregar el material');
    } finally {
      setSaving(false);
    }
  };

  const issueAvailable = async () => {
    setIssuing(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/issue-materials`, { method: 'POST', credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudieron entregar los materiales');
      setActionMessage('Los materiales disponibles fueron entregados a la orden.');
      await mutate();
    } catch (issueError) {
      setActionError(issueError instanceof Error ? issueError.message : 'No se pudieron entregar los materiales');
    } finally {
      setIssuing(false);
    }
  };

  const sendShortagesToPurchasing = async () => {
    if (!status.supply_need_id) return;
    setSending(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await fetch('/api/procurement/supply-needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ supplyNeedId: status.supply_need_id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo enviar la solicitud a Compras');
      setActionMessage('Los faltantes fueron enviados a Compras sin volver a ingresar la información.');
      await mutate();
    } catch (sendError) {
      setActionError(sendError instanceof Error ? sendError.message : 'No se pudo enviar la solicitud a Compras');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Cobertura de materiales</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Requerimiento, existencias disponibles y faltantes para esta orden.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)} disabled={saving || issuing || sending}>
            {adding ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{adding ? 'Cerrar' : 'Agregar material'}
          </Button>
          {availableCount > 0 ? <Button size="sm" variant="outline" onClick={issueAvailable} disabled={issuing || sending || saving}><PackageCheck className="mr-2 h-4 w-4" />{issuing ? 'Entregando…' : 'Entregar disponibles'}</Button> : null}
          {shortageCount > 0 && status.supply_need_id && !alreadySent ? <Button size="sm" onClick={sendShortagesToPurchasing} disabled={sending || issuing || saving}><ShoppingCart className="mr-2 h-4 w-4" />{sending ? 'Enviando…' : 'Enviar faltantes a Compras'}</Button> : null}
          {alreadySent && shortageCount > 0 ? <Badge variant="secondary">Solicitud enviada a Compras</Badge> : null}
          {rows.length > 0 ? <Badge variant={shortageCount > 0 ? 'destructive' : 'secondary'}>{shortageCount > 0 ? `${shortageCount} faltante(s)` : 'Cubierta'}</Badge> : <Badge variant="outline">Sin requerimiento</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
        {actionMessage ? <div className="rounded-lg border bg-muted/40 p-3 text-sm">{actionMessage}</div> : null}

        {adding ? <div className="rounded-lg border bg-muted/20 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end">
            <div className="space-y-2"><p className="text-xs font-medium">Buscar producto canónico</p><Input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder="Código o nombre, mínimo 2 caracteres" /></div>
            <div className="space-y-2"><p className="text-xs font-medium">Cantidad</p><Input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
            <Button onClick={addMaterial} disabled={!selected || saving || Number(quantity) <= 0}>{saving ? 'Guardando…' : 'Agregar'}</Button>
          </div>
          {selected ? <div className="mt-3 rounded-md border bg-card p-3 text-sm"><p className="font-medium">{selected.productCode || 'Sin código'} · {selected.productName}</p><p className="mt-1 text-xs text-muted-foreground">Disponible ahora: {selected.quantityAvailable} {selected.unit || 'unid.'} · {selected.warehouses.length ? selected.warehouses.join(', ') : 'sin bodega informada'}</p></div> : null}
          {!selected && query.trim().length >= 2 ? <div className="mt-3 max-h-56 overflow-auto rounded-md border bg-card">
            {catalogLoading ? <p className="p-3 text-sm text-muted-foreground">Buscando…</p> : catalogRows.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Sin coincidencias disponibles.</p> : catalogRows.map((item) => <button key={item.productId} type="button" onClick={() => setSelected(item)} className="block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"><p className="text-sm font-medium">{item.productCode || 'Sin código'} · {item.productName}</p><p className="mt-0.5 text-xs text-muted-foreground">Disponible {item.quantityAvailable} {item.unit || 'unid.'}{item.family ? ` · ${item.family}` : ''}</p></button>)}
          </div> : null}
        </div> : null}

        {isLoading ? <div className="h-20 animate-pulse rounded-lg bg-muted" /> : null}
        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}
        {!isLoading && !error && rows.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"><PackageSearch className="mx-auto mb-2 h-5 w-5" />Aún no se han definido materiales requeridos para esta orden. Usa “Agregar material” para activar el cruce con stock y Compras.</div> : null}
        {rows.length > 0 ? <div className="divide-y rounded-lg border">{rows.map((row) => {
          const missing = shortage(row);
          return <div key={String(rowKey(row))} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_110px_110px_120px] sm:items-center">
            <div className="min-w-0"><p className="truncate font-medium">{row.product_name || 'Producto'}</p><p className="text-xs text-muted-foreground">{row.product_code || 'Sin código'}</p></div>
            <div><p className="text-xs text-muted-foreground">Requerido</p><p className="font-medium">{required(row)}</p></div>
            <div><p className="text-xs text-muted-foreground">Disponible</p><p className="font-medium">{available(row)}</p></div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">{missing > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-muted-foreground" />}<span className={missing > 0 ? 'font-semibold text-destructive' : 'font-medium'}>{missing > 0 ? `Faltan ${missing}` : 'Cubierto'}</span></div>
          </div>;
        })}</div> : null}
      </CardContent>
    </Card>
  );
}
