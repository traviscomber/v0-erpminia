'use client';

import { useMemo, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { Download, Search, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
};

export default function HSEInvestigacionesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    incident_id: '',
    root_cause: '',
    corrective_actions: '',
    assigned_to: '',
    target_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { data, error, isLoading, mutate } = useSWR('/api/hse/investigations', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300000,
  });

  const investigations = data?.investigations || [];

  const filtered = useMemo(
    () =>
      investigations.filter((item: any) =>
        `${item.incident_id || ''} ${item.root_cause || ''} ${item.corrective_actions || ''} ${item.assigned_to || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [investigations, searchTerm]
  );

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc: Record<string, number>, item: any) => {
        const status = String(item.status || 'open').toLowerCase();
        acc.total += 1;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [filtered]);

  const downloadTemplate = () => {
    const headers = ['INCIDENT_ID', 'ROOT_CAUSE', 'CORRECTIVE_ACTIONS', 'ASSIGNED_TO', 'TARGET_DATE'];
    const rows = [
      ['INC-001', 'Falta de procedimiento', 'Actualizar procedimiento y capacitar', 'Supervisor HSE', '2026-07-15'],
      ['INC-002', 'Condicion insegura', 'Instalar barrera fisica', 'Jefe de turno', '2026-07-20'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-investigaciones-hse.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/hse/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo crear la investigacion');
      }

      setForm({
        incident_id: '',
        root_cause: '',
        corrective_actions: '',
        assigned_to: '',
        target_date: '',
      });
      await mutate();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="text-red-500">Error al cargar investigaciones.</div>;
  if (isLoading) return <div className="text-gray-500">Cargando investigaciones...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investigaciones HSE</h1>
          <p className="text-muted-foreground">Seguimiento de causas raiz y acciones correctivas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button variant="outline" onClick={() => mutate()}>
            <Search className="mr-2 h-4 w-4" />
            Recargar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total || investigations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.open || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.closed || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5" />
            Crear investigacion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <Input
              placeholder="ID del incidente"
              value={form.incident_id}
              onChange={(e) => setForm((current) => ({ ...current, incident_id: e.target.value }))}
            />
            <Input
              placeholder="Responsable"
              value={form.assigned_to}
              onChange={(e) => setForm((current) => ({ ...current, assigned_to: e.target.value }))}
            />
            <Input
              placeholder="Fecha objetivo"
              type="date"
              value={form.target_date}
              onChange={(e) => setForm((current) => ({ ...current, target_date: e.target.value }))}
            />
            <div />
            <textarea
              className="min-h-[110px] rounded-md border border-input bg-background p-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 md:col-span-2"
              placeholder="Causa raiz"
              value={form.root_cause}
              onChange={(e) => setForm((current) => ({ ...current, root_cause: e.target.value }))}
            />
            <textarea
              className="min-h-[110px] rounded-md border border-input bg-background p-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 md:col-span-2"
              placeholder="Acciones correctivas"
              value={form.corrective_actions}
              onChange={(e) => setForm((current) => ({ ...current, corrective_actions: e.target.value }))}
            />
            {errorMessage ? (
              <p className="text-sm text-red-600 md:col-span-2">{errorMessage}</p>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar investigacion'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar investigacion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.map((item: any) => (
          <Card key={item.id || `${item.incident_id}-${item.created_at}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-[var(--brand-rojo)]" />
                    <h3 className="font-semibold">{item.incident_id || 'Sin incidente asociado'}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.root_cause || 'Sin causa raiz registrada'}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.corrective_actions || 'Sin acciones correctivas registradas'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{item.status || 'open'}</Badge>
                    {item.assigned_to ? <Badge variant="outline">{item.assigned_to}</Badge> : null}
                    {item.target_date ? <Badge variant="outline">{item.target_date}</Badge> : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">No hay coincidencias para el filtro actual.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}