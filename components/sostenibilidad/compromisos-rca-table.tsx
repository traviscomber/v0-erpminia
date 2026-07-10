'use client';

import { useCallback, useRef, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, ChevronDown, ChevronUp, Download, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Compromiso {
  id: string;
  numero: number;
  etapa: string;
  componente: string;
  compromiso: string;
  referencia_rca: string | null;
  tipo_control: string | null;
  registro_cumplimiento: string | null;
  cumple: boolean;
  responsable: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  cumple: number;
  noCumple: number;
  porComponente: Record<string, number>;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => r.json());

const COMPONENTES_DISPLAY: Record<string, string> = {
  'INFRAESTRUCTURAS': 'Infraestructuras',
  'INFRAESTRUTURA': 'Infraestructuras',
  'INFRAESTRUCTURA': 'Infraestructuras',
  'INFRESTRUCTURA': 'Infraestructuras',
  'AGUA SUPERFICIAL': 'Agua Superficial',
  'AGUA SUPERFICIAL-AGUA SUBTERRÁNEA': 'Agua Superficial / Subterránea',
  'AGUAS SUPERFICIALES': 'Aguas Superficiales',
  'SUELO': 'Suelo',
  'AIRE': 'Aire',
  'FLORA': 'Flora',
  'FAUNA': 'Fauna',
  'ARQUEOLOGIA': 'Arqueología',
  'ACTIVIDAD ECONOMICA': 'Actividad Económica',
  'RESIDUOS LIQUIDOS': 'Residuos Líquidos',
  'RESIDUOS': 'Residuos',
};

const ETAPAS_DISPLAY: Record<string, string> = {
  'OPERACIÓN': 'Operación',
  'CONSTRUCCIÓN': 'Construcción',
  'CONTRUCCIÓN': 'Construcción',
  'CONSTRUCCIÓN-OPERACIÓN': 'Construcción / Operación',
  'CONSTRUCCIÓN-OPERACIÓN Y CIERRE': 'Construcción / Operación / Cierre',
  'OPERACIÓN-CIERRE': 'Operación / Cierre',
  'CIERRE': 'Cierre',
};

function etapaColor(etapa: string) {
  if (etapa.includes('CIERRE')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  if (etapa.includes('CONSTRUCCIÓN') || etapa.includes('CONTRUCCIÓN')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return 'bg-green-500/10 text-green-400 border-green-500/20';
}

function tipoControlBadge(tipo: string | null) {
  if (!tipo) return null;
  const map: Record<string, string> = { seguimiento: 'Seguimiento', registro: 'Registro', ambos: 'Seguimiento + Registro' };
  return <Badge variant="outline" className="text-xs">{map[tipo] ?? tipo}</Badge>;
}

export function CompromisosRcaTable() {
  const [search, setSearch] = useState('');
  const [componente, setComponente] = useState('todos');
  const [etapa, setEtapa] = useState('todos');
  const [cumple, setCumple] = useState('todos');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams();
  if (componente !== 'todos') params.set('componente', componente);
  if (etapa !== 'todos') params.set('etapa', etapa);
  if (cumple !== 'todos') params.set('cumple', cumple);
  if (search) params.set('search', search);

  const { data, isLoading, mutate } = useSWR<{ compromisos: Compromiso[]; stats: Stats }>(
    `/api/sostenibilidad/compromisos-ambientales?${params.toString()}`,
    fetcher
  );

  const compromisos = data?.compromisos ?? [];
  const stats = data?.stats;

  // Unique values for filter dropdowns — from stats porComponente
  const componenteKeys = Object.keys(stats?.porComponente ?? {});
  const etapasUnicas = [...new Set(compromisos.map(c => c.etapa))];

  const handleDownloadTemplate = useCallback(() => {
    const csv = [
      ['NÚMERO', 'ETAPA DEL PROYECTO', 'COMPONENTE', 'COMPROMISOS AMBIENTALES ', 'Área, Sección, Título, Párrafo identificado', 'SEGUIMIENTO', 'REGISTRO', 'REGISTRO DE CUMPLIMIENTO', 'NO CUMPLE', 'CUMPLE', 'RESPONSABLE'],
      [1, 'OPERACIÓN', 'INFRAESTRUCTURAS', 'Ejemplo de compromiso ambiental', 'RCA 480 Considerando 3.8', 'X', '', 'E-700', '', 'X', 'Juan Pérez'],
    ].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'plantilla-compromisos-ambientales.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/sostenibilidad/compromisos-ambientales', {
        method: 'POST', body: form, credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`${json.imported} compromisos importados correctamente`);
      mutate();
    } catch (err: any) {
      toast.error(`Error al importar: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [mutate]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Compromisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cumplen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{stats?.cumple ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No Cumplen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats?.noCumple ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.total ? Math.round((stats.cumple / stats.total) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Actions */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 flex-1">
              <Input
                placeholder="Buscar compromiso..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64"
              />
              <Select value={componente} onValueChange={setComponente}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Componente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los componentes</SelectItem>
                  {componenteKeys.map(k => (
                    <SelectItem key={k} value={k}>
                      {COMPONENTES_DISPLAY[k] ?? k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={etapa} onValueChange={setEtapa}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las etapas</SelectItem>
                  {etapasUnicas.map(e => (
                    <SelectItem key={e} value={e}>
                      {ETAPAS_DISPLAY[e] ?? e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cumple} onValueChange={setCumple}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="true">Cumple</SelectItem>
                  <SelectItem value="false">No cumple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Plantilla Excel
              </Button>
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Importando...' : 'Importar Excel'}
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registro Maestro de Compromisos Ambientales</CardTitle>
          <CardDescription>
            {compromisos.length} compromisos mostrados
            {search || componente !== 'todos' || etapa !== 'todos' || cumple !== 'todos' ? ' (filtrado)' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando compromisos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-12">N°</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-36">Etapa</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-40">Componente</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Compromiso Ambiental</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-32">Referencia RCA</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-32">Control</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-40">Registro Cumplimiento</th>
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-36">Responsable</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground w-24">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {compromisos.map(c => (
                    <>
                      <tr
                        key={c.id}
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                      >
                        <td className="px-3 py-3 font-mono font-bold text-muted-foreground">{c.numero}</td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className={`text-xs ${etapaColor(c.etapa)}`}>
                            {ETAPAS_DISPLAY[c.etapa] ?? c.etapa}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-xs font-medium">
                          {COMPONENTES_DISPLAY[c.componente] ?? c.componente}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <p className="line-clamp-2 text-sm leading-relaxed max-w-lg">{c.compromiso}</p>
                            {expandedRow === c.id
                              ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                              : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                            }
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{c.referencia_rca ?? '—'}</td>
                        <td className="px-3 py-3">{tipoControlBadge(c.tipo_control)}</td>
                        <td className="px-3 py-3 text-xs">{c.registro_cumplimiento ?? '—'}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{c.responsable ?? '—'}</td>
                        <td className="px-3 py-3 text-center">
                          {c.cumple
                            ? <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto" />
                            : <XCircle className="h-5 w-5 text-destructive mx-auto" />
                          }
                        </td>
                      </tr>
                      {expandedRow === c.id && (
                        <tr key={`${c.id}-expanded`} className="bg-muted/20 border-b">
                          <td colSpan={9} className="px-6 py-4">
                            <p className="text-sm leading-relaxed text-foreground">{c.compromiso}</p>
                            {c.referencia_rca && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                <span className="font-semibold">Referencia RCA:</span> {c.referencia_rca}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              {compromisos.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No hay compromisos que coincidan con los filtros
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
