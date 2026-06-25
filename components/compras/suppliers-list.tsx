'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Supplier {
  id: string;
  name: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  contact_person: string;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function SuppliersList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 0, pageSize: 50, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);

  const fetchSuppliers = async (pageNum = 0) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: '50',
        search,
      });
      const res = await fetch(`/api/compras/suppliers?${params}`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(0);
    setPage(0);
  }, [search]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchSuppliers(newPage);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Directorio de Proveedores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, RUT, email o contacto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button size="sm" onClick={() => fetchSuppliers(page)} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border bg-muted">
                <th className="p-3 text-left font-bold">Nombre</th>
                <th className="p-3 text-left font-bold">RUT</th>
                <th className="p-3 text-left font-bold">Contacto</th>
                <th className="p-3 text-left font-bold">Email</th>
                <th className="p-3 text-left font-bold">Teléfono</th>
                <th className="p-3 text-left font-bold">Dirección</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Cargando proveedores...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No se encontraron proveedores
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier, idx) => (
                  <tr
                    key={supplier.id}
                    className={`border-b border-border ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                  >
                    <td className="p-3 font-semibold">{supplier.name}</td>
                    <td className="p-3 font-mono text-xs">{supplier.rut}</td>
                    <td className="p-3">{supplier.contact_person || '-'}</td>
                    <td className="p-3 text-xs">{supplier.email || '-'}</td>
                    <td className="p-3">{supplier.phone || '-'}</td>
                    <td className="p-3 max-w-xs truncate text-xs text-muted-foreground">{supplier.address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {page * pagination.pageSize + 1} a{' '}
              {Math.min((page + 1) * pagination.pageSize, pagination.total)} de {pagination.total.toLocaleString()}{' '}
              proveedores
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(pagination.totalPages - 1, page + 1))}
                disabled={page >= pagination.totalPages - 1}
                className="gap-1"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            Total de proveedores importados: <span className="font-bold text-foreground">{pagination.total.toLocaleString()}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
