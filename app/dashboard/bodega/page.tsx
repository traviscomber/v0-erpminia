'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Boxes, FileText, PackageCheck, Search, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el inventario');
  return payload;
};

const number = (value: unknown) => new Intl.NumberFormat('es-CL').format(Number(value || 0));
const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));

type InventoryPosition = {
  stock_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  family?: string | null;
  unit?: string | null;
  quantity_available: number;
  quantity_reserved: number;
  stock_value: number;
  stock_status: string;
};

export default function BodegaPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (status !== 'all') params.set('status', status);
  const { data, error, isLoading } = useSWR(`/api/inventory/intelligence?${params.toString()}`, fetcher);
  const overview = data?.overview || {};
  const positions: InventoryPosition[] = data?.positions || [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Inventario</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inventario canónico</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Una sola posición de stock conecta producto, compra, recepción, reserva, consumo en OT y costo del activo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/dashboard/bodega/documentos"><FileText className="mr-2 h-4 w-4" />Documentos</Link></Button>
          <Button asChild><Link href="/dashboard/bodega/importar-datos"><Upload className="mr-2 h-4 w-4" />Importar evidencia</Link></Button>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error.message}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Productos con stock</p><p className="mt-1 text-2xl font-semibold">{number(overview.products_with_stock)}</p></div><Boxes className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Valor inventario</p><p className="mt-1 text-2xl font-semibold">{money(overview.total_stock_value)}</p></div><PackageCheck className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Reposición requerida</p><p className="mt-1 text-2xl font-semibold">{number(overview.reorder_products)}</p></div><AlertTriangle className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="shadow-none"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Conteo vencido</p><p className="mt-1 text-2xl font-semibold">{number(overview.count_overdue_products)}</p></div><AlertTriangle className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código o producto" /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full lg:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="healthy">Saludable</SelectItem><SelectItem value="reorder">Reposición</SelectItem><SelectItem value="out_of_stock">Sin stock</SelectItem><SelectItem value="negative">Stock negativo</SelectItem><SelectItem value="expired">Vencido</SelectItem><SelectItem value="expiring">Próximo a vencer</SelectItem></SelectContent></Select>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="hidden grid-cols-[140px_1fr_120px_120px_130px_120px_36px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Código</span><span>Producto</span><span>Disponible</span><span>Reservado</span><span>Valor</span><span>Estado</span><span />
          </div>
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Cargando inventario...</p> : null}
          {!isLoading && !positions.length ? <p className="p-8 text-center text-sm text-muted-foreground">No hay posiciones para los filtros seleccionados.</p> : null}
          {positions.map((row) => (
            <Link
              key={row.stock_id}
              href={`/dashboard/bodega/productos/${row.product_id}`}
              className="group grid gap-2 border-b px-4 py-4 transition-colors last:border-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[140px_1fr_120px_120px_130px_120px_36px] lg:items-center lg:gap-4"
            >
              <p className="font-mono text-sm">{row.product_code}</p>
              <div><p className="font-medium group-hover:text-primary">{row.product_name}</p><p className="text-xs text-muted-foreground">{row.family || 'Sin familia'} · {row.unit || 'unidad'}</p></div>
              <p className="text-sm"><span className="lg:hidden text-muted-foreground">Disponible: </span>{number(row.quantity_available)}</p>
              <p className="text-sm"><span className="lg:hidden text-muted-foreground">Reservado: </span>{number(row.quantity_reserved)}</p>
              <p className="text-sm font-medium">{money(row.stock_value)}</p>
              <Badge variant={row.stock_status === 'healthy' ? 'secondary' : 'outline'}>{row.stock_status}</Badge>
              <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 lg:block" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
