'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  critica: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle, label: 'Crítica' },
  alta: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: AlertCircle, label: 'Alta' },
  media: { color: 'bg-primary/10 text-primary border-primary/20', icon: AlertCircle, label: 'Media' },
  baja: { color: 'bg-muted text-muted-foreground border-muted', icon: Info, label: 'Baja' },
  info: { color: 'bg-muted text-muted-foreground border-muted', icon: Info, label: 'Info' },
} as const;

function typeLabel(type: AlertType) {
  switch (type) {
    case 'documento': return 'Documentos';
    case 'mantenimiento': return 'Mantenimiento';
    case 'inventario': return 'Bodega';
    case 'sostenibilidad': return 'Sostenibilidad';
    case 'contrato': return 'Legal';
    default: return 'Módulo';
  }
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AlertasPage() {
  const [filter, setFilter] = useState<'todos' | 'no-leidas' | 'criticas' | 'accion'>('todos');
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const { data, error, isLoading, mutate } = useSWR<AlertResponse>('/api/alertas', fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    setAlerts(data?.alerts ?? []);
  }, [data]);

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

  const handleMarkAsRead = (id: string) => {
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)));
  };

  const handleArchive = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Control transversal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Centro de alertas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Prioridades detectadas en mantenimiento, inventario, sostenibilidad, documentos y contratos.
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="gap-2 self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar las alertas operativas.</span>
            </div>
            <Button variant="outline" onClick={() => mutate()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['No leídas', unreadCount, 'Pendientes de revisión'],
          ['Críticas', criticalCount, 'Requieren atención inmediata'],
          ['Con acción', actionCount, 'Tienen seguimiento pendiente'],
        ].map(([label, value, detail]) => (
          <Card key={String(label)}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Alertas operativas</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Ordenadas desde las fuentes reales del sistema.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['todos', 'Todas'],
              ['no-leidas', 'No leídas'],
              ['criticas', 'Críticas'],
              ['accion', 'Con acción'],
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={filter === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(value as typeof filter)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No hay alertas para este filtro.
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              return (
                <article key={alert.id} className={`rounded-xl border p-4 ${alert.read ? 'bg-background' : 'bg-muted/25'}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className={`mt-0.5 rounded-full border p-2 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{alert.title}</h2>
                          <Badge variant="outline">{config.label}</Badge>
                          <Badge variant="outline">{typeLabel(alert.type)}</Badge>
                          {!alert.read && <Badge>Nueva</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(alert.timestamp)}</span>
                          {alert.actionRequired && <span>Requiere acción</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {!alert.read && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(alert.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Marcar leída
                        </Button>
                      )}
                      <Button size="sm" asChild><Link href={alert.actionUrl}>Abrir</Link></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleArchive(alert.id)}>Ocultar</Button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
