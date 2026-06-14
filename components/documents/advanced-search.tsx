'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SearchFilters {
  query: string;
  tags: string[];
  status: string | null;
  category: string | null;
  expiryFilter: 'all' | 'active' | 'expiring_30_days' | 'expired';
  page: number;
  pageSize: number;
}

interface Document {
  id: string;
  document_name: string;
  category: string;
  status: string;
  tags: string[];
  daysUntilExpiry: number | null;
  expiryStatus: 'active' | 'expiring_soon' | 'expired';
  file_url: string;
  created_at: string;
}

interface SearchResultados {
  data: Document[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function AdvancedDocumentSearch() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tags: [],
    status: null,
    category: null,
    expiryFilter: 'all',
    page: 1,
    pageSize: 50,
  });

  const [Resultados, setResultados] = useState<SearchResultados | null>(null);
  const [availableTags, setAvailableTags] = useState<{ systemTags: Record<string, string[]>; userTags: string[] }>({
    systemTags: {},
    userTags: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch available Etiquetas on mount
  useEffect(() => {
    const fetchEtiquetas = async () => {
      try {
        const res = await fetch('/api/documents/tagsmodule=prevención');
        const data = await res.json();
        setAvailableTags(data);
      } catch (err) {
        console.error('[v0] Error fetching tags:', err);
      }
    };
    fetchEtiquetas();
  }, []);

  // Debounced search (built-in, no lodash)
  const performSearch = useCallback(async (searchFilters: SearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/documents/search-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchFilters),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`La búsqueda falló: ${res.status}`);
      }

      const data: SearchResultados = await res.json();
      setResultados(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'La búsqueda falló';
      setError(errorMsg);
      console.error('[v0] Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search when filters change with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      performSearch(filters);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [filters, performSearch]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, query: e.target.value, page: 1 }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
      page: 1,
    }));
  };

  const handleExpiryFilterChange = (filter: SearchFilters['expiryFilter']) => {
    setFilters((prev) => ({ ...prev, expiryFilter: filter, page: 1 }));
  };

  const handleDocumentToggle = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleBulkExport = async () => {
    if (selectedDocs.size === 0) {
      alert('No hay documentos seleccionados');
      return;
    }

    try {
      const res = await fetch('/api/documents/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'csv',
          documentIds: Array.from(selectedDocs),
          filters: {
            module: 'prevención',
            tags: filters.tags,
            status: filters.status,
            category: filters.category,
          },
        }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error('La exportación falló');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos_hse_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[v0] Export error:', err);
      alert('La exportación falló');
    }
  };

  const getExpiryIcon = (expiryStatus: string) => {
    if (expiryStatus === 'active')
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (expiryStatus === 'expiring_soon')
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <X className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Avanzada de Documentos
          </CardTitle>
          <CardDescription>
            Busca por nombre, descripción o palabras clave. Filtra por tags, estado y Vigencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Consulta */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos..."
              value={filters.query}
              onChange={handleQueryChange}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Tag Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Etiquetas {filters.tags.length > 0 && `(${filters.tags.length})`}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {Object.entries(availableTags.systemTags).map(([category, tags]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {category}
                    </div>
                    {tags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag}
                        checked={filters.tags.includes(tag)}
                        onCheckedChange={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Expiry Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Vigencia
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={filters.expiryFilter === 'all'}
                  onCheckedChange={() => handleExpiryFilterChange('all')}
                >
                  Todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.expiryFilter === 'active'}
                  onCheckedChange={() => handleExpiryFilterChange('active')}
                >
                  Vigentes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.expiryFilter === 'expiring_30_days'}
                  onCheckedChange={() => handleExpiryFilterChange('expiring_30_days')}
                >
                  Próximos a Vencer
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.expiryFilter === 'expired'}
                  onCheckedChange={() => handleExpiryFilterChange('expired')}
                >
                  Vencidos
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {(filters.query || filters.tags.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({
                    query: '',
                    tags: [],
                    status: null,
                    category: null,
                    expiryFilter: 'all',
                    page: 1,
                    pageSize: 50,
                  })
                }
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Active Etiquetas */}
          {filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex gap-2 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Buscando documentos...
          </CardContent>
        </Card>
      )}

      {Resultados && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>
              {Resultados.pagination.total} documento{Resultados.pagination.total !== 1 ? 's' : ''} encontrado
              {Resultados.pagination.total !== 1 ? 's' : ''}
            </CardTitle>
            {selectedDocs.size > 0 && (
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={handleBulkExport}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar Seleccionados ({selectedDocs.size})
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {Resultados.data.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay documentos que coincidan con tus criterios
              </p>
            ) : (
              <div className="space-y-3">
                {Resultados.data.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleDocumentToggle(doc.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.has(doc.id)}
                      onChange={() => handleDocumentToggle(doc.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{doc.document_name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {doc.category} • v{doc.id.slice(0, 8)}
                      </p>
                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{doc.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getExpiryIcon(doc.expiryStatus)}
                      {doc.daysUntilExpiry !== null && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {doc.daysUntilExpiry > 0
                            ? `${doc.daysUntilExpiry}d`
                            : 'Vencido'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {Resultados.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={filters.page === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    página {Resultados.pagination.page} de {Resultados.pagination.totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      page: Math.min(Resultados.pagination.totalPages, p.page + 1),
                    }))
                  }
                  disabled={filters.page === Resultados.pagination.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

