'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, AlertTriangle, Clock, Info, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterToolbar, FilterToolbarActions, FilterToolbarGroup } from '@/components/ui/filter-toolbar';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AlertSeverity = 'critica' | 'alta' | 'media' | 'baja' | 'info';
type AlertType = 'documento' | 'mantenimiento' | 'inventario' | 'sostenibilidad' | 'contrato';
type Alert = {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  type: AlertType;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  actionUrl: string;
};
type AlertResponse = { alerts?: Alert[] };

const fetcher = async (url: string): Promise<AlertResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar las alertas');
  return payload || {};
};

const severityConfig = {
  critica: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Crítica' },
  alta: { variant: 'default' as const, icon: AlertCircle, label: 'Alta' },
  media: { variant: 'default' as const, icon: AlertCircle, label: 'Media' },
  baja: { variant: 'outline' as const, icon: Info, label: 'Baja' },
  info: { variant: 'outline' as const, icon: Info, label: 'Info' },
};

function typeLabel(type: AlertType) {
  const labels: Record<AlertType, string> = {
    documento: 'Documentos',
    mantenimiento: 'Mantenimiento',
    inventario: 'Bodega',
    sostenibilidad: 'Sostenibilidad',
    contrato: 'Legal',
  };
  return labels[type];
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AlertasPage() {
  const [filter, setFilter] = useState<'todos' | 'no-leidas' | 'criticas' | 'accion'>('todos');
  const { data, error, isLoading, isValidating, mutate } = useSWR<AlertResponse>('/api/alertas', fetcher, {
    revalidateOnFocus: false,
  });

  const alerts = data?.alerts ?? [];
  const filteredAlerts = useMemo(
    () => alerts.filter((alert) => {
      if (filter === 'no-leidas') return !alert.read;
      if (filter === 'criticas') return alert.severity === 'critica';
      if (filter === 'accion') return alert.actionRequired;
      return true;
    }),
    [alerts, filter],
  );

  const unreadCount = alerts.filter((alert) => !alert.read).length;
  const criticalCount = alerts.filter((alert) => alert.severity === 'critica').length;
  const actionCount = alerts.filter((alert) => alert.actionRequired).length;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Control transversal</PageHeaderEyebrow>
          <PageHeaderTitle>Centro de alertas</PageHeaderTitle>
          <PageHeaderDescription>
            Prioridades reales detectadas en mantenimiento, abastecimiento, sostenibilidad, documentos y contratos.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <div className="grid divide-y rounded-lg border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ['No leídas', unreadCount, 'Pendientes de revisión'],
          ['Críticas', criticalCount, 'Atención inmediata'],
          ['Con acción', actionCount, 'Seguimiento pendiente'],
        ].map(([label, value, detail]) => (
          <div key={String(label)} className="px-5 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>

      <FilterToolbar>
        <FilterToolbarGroup>
          <p className="text-sm text-muted-foreground">{filteredAlerts.length} alertas visibles</p>
        </FilterToolbarGroup>
        <FilterToolbarActions>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <TabsList>
              <TabsTrigger value="todos">Todas</TabsTrigger>
              <TabsTrigger value="no-leidas">No leídas</TabsTrigger>
              <TabsTrigger value="criticas">Críticas</TabsTrigger>
              <TabsTrigger value="accion">Con acción</TabsTrigger>
            </TabsList>
          </Tabs>
        </FilterToolbarActions>
      </FilterToolbar>

      {isLoading ? <StatePanel tone="loading" title="Cargando alertas" description="Consultando las fuentes operacionales." /> : null}
      {error ? (
        <StatePanel
          tone="error"
          title="No fue posible cargar las alertas"
          description={error.message}
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
        />
      ) : null}
      {!isLoading && !error && filteredAlerts.length === 0 ? (
        <StatePanel tone="neutral" title="No hay alertas para este filtro" description="No existen registros que coincidan con la vista seleccionada." />
      ) : null}

      {!isLoading && !error && filteredAlerts.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {filteredAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              return (
                <article key={alert.id} className={`grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-5 ${alert.read ? '' : 'bg-muted/20'}`}>
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className={`h-4 w-4 ${alert.severity === 'critica' ? 'text-destructive' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold leading-6">{alert.title}</h2>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <Badge variant="outline">{typeLabel(alert.type)}</Badge>
                        {!alert.read ? <Badge variant="secondary">Nueva</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{alert.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime(alert.timestamp)}</span>
                        {alert.actionRequired ? <span>Requiere acción</span> : null}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" asChild><Link href={alert.actionUrl}>Abrir fuente</Link></Button>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
