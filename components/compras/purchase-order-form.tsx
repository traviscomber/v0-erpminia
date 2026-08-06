'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, ChevronsUpDown, LoaderCircle, Search, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

type Supplier = {
  id: string;
  name: string;
  rut: string;
  email?: string;
  contact_person?: string;
};

type PurchaseOrderFormState = {
  vendor_name: string;
  supplier_id: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  delivery_date: string;
};

type PurchaseOrderResult = {
  po_number?: string;
  total_amount?: number | string;
} | null;

const money = (value: number | string | undefined) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

export function PurchaseOrderForm() {
  const searchParams = useSearchParams();
  const prefilledRef = searchParams.get('ref') || '';
  const prefilledCostCenter = searchParams.get('cost_center') || '';

  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<PurchaseOrderFormState>({
    vendor_name: '',
    supplier_id: '',
    item_code: prefilledRef,
    quantity: 1,
    unit_price: 0,
    delivery_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PurchaseOrderResult>(null);
  const [error, setError] = useState('');

  const total = useMemo(() => {
    const quantity = Number.isFinite(formData.quantity) ? formData.quantity : 0;
    const price = Number.isFinite(formData.unit_price) ? formData.unit_price : 0;
    return quantity * price;
  }, [formData.quantity, formData.unit_price]);

  useEffect(() => {
    if (!showDropdown) return;

    const delay = supplierSearch.length > 0 ? 250 : 0;
    const timer = setTimeout(async () => {
      setLoadingSuppliers(true);
      try {
        const params = new URLSearchParams({ search: supplierSearch, pageSize: '100', page: '0' });
        const res = await fetch(`/api/compras/suppliers?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('No fue posible buscar proveedores.');
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      } catch {
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [supplierSearch, showDropdown]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData((current) => ({ ...current, vendor_name: supplier.name, supplier_id: supplier.id }));
    setSupplierSearch(supplier.name);
    setShowDropdown(false);
    setError('');
  };

  const clearSupplier = () => {
    setSelectedSupplier(null);
    setSupplierSearch('');
    setFormData((current) => ({ ...current, vendor_name: '', supplier_id: '' }));
  };

  const validate = () => {
    if (!selectedSupplier) return 'Selecciona un proveedor de la lista.';
    if (!formData.item_code.trim()) return 'Ingresa el producto o referencia de compra.';
    if (!Number.isFinite(formData.quantity) || formData.quantity <= 0) return 'La cantidad debe ser mayor que cero.';
    if (!Number.isFinite(formData.unit_price) || formData.unit_price <= 0) return 'El costo unitario debe ser mayor que cero.';
    if (!formData.delivery_date) return 'Selecciona una fecha de entrega.';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/compras/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, item_code: formData.item_code.trim() }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'No fue posible crear la orden de compra.');

      setResult(payload?.data || null);
      setFormData({ vendor_name: '', supplier_id: '', item_code: '', quantity: 1, unit_price: 0, delivery_date: '' });
      setSelectedSupplier(null);
      setSupplierSearch('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible crear la orden de compra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos de la orden</CardTitle>
        <CardDescription>Selecciona el proveedor, identifica el producto y confirma cantidad, costo y entrega.</CardDescription>
      </CardHeader>
      <CardContent>
        {prefilledRef ? (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Compra vinculada a <span className="font-semibold">{prefilledRef}</span>
              {prefilledCostCenter ? <span className="text-muted-foreground"> · Centro de costo {prefilledCostCenter}</span> : null}
            </span>
          </div>
        ) : null}

        {result ? (
          <div className="mb-5 flex gap-2 rounded-lg border border-secondary/30 bg-secondary/10 p-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-secondary" />
            <div>
              <p className="text-sm font-semibold">Orden de compra creada</p>
              <p className="text-sm text-muted-foreground">{result.po_number || 'Orden registrada'} · Total {money(result.total_amount)}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="supplier-search">Proveedor *</Label>
            <div className="relative" ref={dropdownRef}>
              <div className="flex min-h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="supplier-search"
                  className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar por nombre o RUT"
                  value={supplierSearch}
                  autoComplete="off"
                  aria-expanded={showDropdown}
                  aria-controls="supplier-options"
                  onChange={(event) => {
                    setSupplierSearch(event.target.value);
                    setShowDropdown(true);
                    if (!event.target.value) clearSupplier();
                    else if (selectedSupplier && event.target.value !== selectedSupplier.name) {
                      setSelectedSupplier(null);
                      setFormData((current) => ({ ...current, vendor_name: '', supplier_id: '' }));
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                {selectedSupplier ? (
                  <button type="button" onClick={clearSupplier} aria-label="Quitar proveedor" className="rounded p-1 hover:bg-muted">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                ) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
              </div>

              {selectedSupplier ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-mono">{selectedSupplier.rut}</Badge>
                  {selectedSupplier.contact_person ? <span>{selectedSupplier.contact_person}</span> : null}
                  {selectedSupplier.email ? <span>{selectedSupplier.email}</span> : null}
                </div>
              ) : null}

              {showDropdown ? (
                <div id="supplier-options" className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                  {loadingSuppliers ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Buscando proveedores…</div>
                  ) : suppliers.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">No se encontraron proveedores.</div>
                  ) : (
                    <ul className="max-h-60 overflow-y-auto py-1">
                      {suppliers.map((supplier) => (
                        <li key={supplier.id}>
                          <button type="button" className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => selectSupplier(supplier)}>
                            <span className="font-medium">{supplier.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{supplier.rut}{supplier.contact_person ? ` · ${supplier.contact_person}` : ''}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-code">Producto o referencia *</Label>
            <Input id="item-code" value={formData.item_code} onChange={(event) => setFormData({ ...formData, item_code: event.target.value })} placeholder="Ej. Filtro hidráulico CAT 336" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input id="quantity" type="number" min="1" step="1" value={Number.isFinite(formData.quantity) ? formData.quantity : ''} onChange={(event) => setFormData({ ...formData, quantity: event.target.value === '' ? Number.NaN : Number(event.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-price">Costo unitario en pesos *</Label>
              <Input id="unit-price" type="number" min="1" step="1" value={Number.isFinite(formData.unit_price) ? formData.unit_price : ''} onChange={(event) => setFormData({ ...formData, unit_price: event.target.value === '' ? Number.NaN : Number(event.target.value) })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-date">Fecha esperada de entrega *</Label>
            <Input id="delivery-date" type="date" value={formData.delivery_date} onChange={(event) => setFormData({ ...formData, delivery_date: event.target.value })} />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total estimado</p>
              <p className="mt-1 text-2xl font-semibold">{money(total)}</p>
            </div>
            <Button type="submit" disabled={loading} className="sm:min-w-44">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Creando orden…' : 'Crear orden'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
