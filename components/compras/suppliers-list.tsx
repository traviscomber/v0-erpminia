'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Search, ChevronLeft, ChevronRight, Copy, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar proveedores');
  return payload;
};

type SupplierRow = {
  id: string;
  name: string | null;
  rut: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_person: string | null;
};

type SuppliersResponse = {
  suppliers?: SupplierRow[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type SuppliersListProps = {
  showPurchaseAction?: boolean;
};

export function SuppliersList({ showPurchaseAction = false }: SuppliersListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 400);
  };

  const params = new URLSearchParams({
    page: String(page),
    pageSize: '50',
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const { data, isLoading, error, mutate } = useSWR<SuppliersResponse>(`/api/compras/suppliers?${params}`, fetcher);
  const suppliers = Array.isArray(data?.suppliers) ? data.suppliers : [];
  const pagination = data?.pagination || { page: 0, pageSize: 50, total: 0, totalPages: 0 };

  const handleCopy = async (value: string | null | undefined) => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Directorio de proveedores</CardTitle>
        <CardDescription>
          {pagination.total > 0 ? `${pagination.total.toLocaleString('es-CL')} proveedores registrados` : 'Proveedores del sistema'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RUT, email o contacto..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-10"
          />
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">No fue posible cargar los proveedores.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>
              Reintentar
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando proveedores...</div>
        ) : suppliers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {debouncedSearch ? 'Sin resultados para la búsqueda' : 'No hay proveedores registrados'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{supplier.rut || '-'}</TableCell>
                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                    <TableCell className="text-xs">{supplier.email || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{supplier.address || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(supplier.rut || supplier.name)} className="h-8 px-2">
                          <Copy className="mr-1 h-4 w-4" />
                          Copiar
                        </Button>
                        {showPurchaseAction && (
                          <Button asChild variant="outline" size="sm" className="h-8 px-2">
                            <a href="/dashboard/compras">
                              <ShoppingCart className="mr-1 h-4 w-4" />
                              Compras
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Página {page + 1} de {pagination.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(pagination.totalPages - 1, current + 1))} disabled={page >= pagination.totalPages - 1}>
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
