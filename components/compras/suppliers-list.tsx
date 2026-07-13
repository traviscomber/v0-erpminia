'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Search, ChevronLeft, ChevronRight, Copy, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

export function SuppliersList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Debounce search to avoid excessive API calls
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
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

  const { data, isLoading, error } = useSWR<SuppliersResponse>(`/api/compras/suppliers?${params}`, fetcher);

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
        <CardTitle>Directorio de Proveedores</CardTitle>
        <CardDescription>
          {pagination.total > 0
            ? `${pagination.total.toLocaleString()} proveedores importados`
            : 'Proveedores del sistema'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RUT, email o contacto..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {error && <p className="text-sm text-destructive">Error cargando proveedores</p>}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando proveedores...</div>
        ) : suppliers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {debouncedSearch ? 'Sin resultados para la busqueda' : 'No hay proveedores importados aun'}
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
                  <TableHead>Telefono</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.rut || '-'}</TableCell>
                    <TableCell>{s.contact_person || '-'}</TableCell>
                    <TableCell className="text-xs">{s.email || '-'}</TableCell>
                    <TableCell>{s.phone || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {s.address || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(s.rut || s.name)}
                          className="h-8 px-2"
                        >
                          <Copy className="mr-1 h-4 w-4" />
                          Copiar
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 px-2">
                          <a href="/dashboard/compras">
                            <ShoppingCart className="mr-1 h-4 w-4" />
                            Compras
                          </a>
                        </Button>
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
            <span className="text-sm text-muted-foreground">
              Pagina {page + 1} de {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages - 1, p + 1))}
                disabled={page >= pagination.totalPages - 1}
              >
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
