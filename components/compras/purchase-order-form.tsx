'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, ChevronsUpDown, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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

export function PurchaseOrderForm() {
  const searchParams = useSearchParams();
  const prefilledRef = searchParams.get('ref') || '';
  const prefilledCostCenter = searchParams.get('cost_center') || '';

  // Supplier combobox state
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState<PurchaseOrderFormState>({
    vendor_name: '',
    supplier_id: '',
    item_code: prefilledRef,
    quantity: 1,
    unit_price: 0,
    delivery_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Fetch suppliers — debounced on search change, immediate on dropdown open
  useEffect(() => {
    if (!showDropdown) return;
    const delay = supplierSearch.length > 0 ? 250 : 0;
    const timer = setTimeout(async () => {
      setLoadingSuppliers(true);
      try {
        const params = new URLSearchParams({
          search: supplierSearch,
          pageSize: '100', // show up to 100 per query across 2158 suppliers
          page: '0',
        });
        const res = await fetch(`/api/compras/suppliers?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data.suppliers || []);
        }
      } catch {
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [supplierSearch, showDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSupplier = (s: Supplier) => {
    setSelectedSupplier(s);
    setFormData((f) => ({ ...f, vendor_name: s.name, supplier_id: s.id }));
    setSupplierSearch(s.name);
    setShowDropdown(false);
  };

  const clearSupplier = () => {
    setSelectedSupplier(null);
    setSupplierSearch('');
    setFormData((f) => ({ ...f, vendor_name: '', supplier_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) {
      setError('Selecciona un proveedor de la lista');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/compras/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const { data } = await res.json();
        setResult(data);
        setFormData({ vendor_name: '', supplier_id: '', item_code: '', quantity: 1, unit_price: 0, delivery_date: '' });
        setSelectedSupplier(null);
        setSupplierSearch('');
      } else {
        setError('No se pudo crear la orden de compra');
      }
    } catch {
      setError('No se pudo crear la orden de compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear orden de compra</CardTitle>
      </CardHeader>
      <CardContent>

        {/* Machine context banner */}
        {prefilledRef && (
          <div className="mb-4 flex items-center gap-2 rounded border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
            <span>
              Repuestos para <span className="font-semibold">{prefilledRef}</span>
              {prefilledCostCenter && (
                <span className="text-muted-foreground"> — CC {prefilledCostCenter}</span>
              )}
            </span>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="mb-4 flex gap-2 rounded border border-green-200 bg-green-50 p-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">Orden de compra creada</p>
              <p className="text-sm text-green-700">{result.po_number} — Total: ${result.total_amount}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 flex gap-2 rounded border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Supplier combobox */}
          <div>
            <label className="mb-1 block text-sm font-semibold">Proveedor</label>
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar proveedor por nombre o RUT..."
                  value={supplierSearch}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) clearSupplier();
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                {selectedSupplier ? (
                  <button type="button" onClick={clearSupplier}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                ) : (
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Selected supplier info */}
              {selectedSupplier && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-mono">{selectedSupplier.rut}</Badge>
                  {selectedSupplier.contact_person && <span>{selectedSupplier.contact_person}</span>}
                  {selectedSupplier.email && <span>{selectedSupplier.email}</span>}
                </div>
              )}

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                  {loadingSuppliers ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Buscando...
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No se encontraron proveedores
                    </div>
                  ) : (
                    <>
                      <ul className="max-h-60 overflow-y-auto py-1">
                        {suppliers.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                              onClick={() => selectSupplier(s)}
                            >
                              <span className="font-medium">{s.name}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {s.rut}
                                {s.contact_person && ` · ${s.contact_person}`}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {suppliers.length === 100 && (
                        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                          Mostrando 100 de 2158 — escribe para filtrar
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Item code */}
          <div>
            <label className="mb-1 block text-sm font-semibold">Código del producto / referencia</label>
            <Input
              value={formData.item_code}
              onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              placeholder="Ej: PART-001"
              required
            />
          </div>

          {/* Quantity + price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">Cantidad</label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Costo unitario ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          {/* Delivery date */}
          <div>
            <label className="mb-1 block text-sm font-semibold">Fecha de entrega</label>
            <Input
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              required
            />
          </div>

          <Button type="submit" disabled={loading || !selectedSupplier} className="w-full">
            {loading ? 'Creando...' : 'Crear orden de compra'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
