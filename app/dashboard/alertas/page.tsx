'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
} from 'lucide-react';

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

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return null;
  }

  return payload;
};

const severityConfig = {
  critica: {
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: AlertTriangle,
    label: 'Crítica',
  },
  alta: {
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: AlertCircle,
    label: 'Alta',
  },
  media: {
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: AlertCircle,
    label: 'Media',
  },
  baja: {
    color: 'bg-muted text-muted-foreground border-muted',
    icon: Info,
    label: 'Baja',
  },
  info: {
    color: 'bg-muted text-muted-foreground border-muted',
    icon: Info,
    label: 'Info',
  },
} as const;

function typeLabel(type: AlertType) {
  switch (type) {
    case 'documento':
      return 'Documentos';
    case 'mantenimiento':
      return 'Mantención';
    case 'inventario':
      return 'Bodega';
    case 'sostenibilidad':
      return 'Sostenibilidad';
    case 'contrato':
      return 'Legal';
    default:
      return 'Módulo';
  }
}

export default function AlertasPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'todos' | 'no-leidas' | 'criticas' | 'accion'>('todos');
  const [archivedCount, setArchivedCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const { data, error, isLoading, mutate } = useSWR('/api/alertas', fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    setAlerts((data?.alerts || []) as Alert[]);
  }, [data]);

  useEffect(() => {
    if (selectedAlert && !alerts.find((alert) => alert.id === selectedAlert.id)) {
      setSelectedAlert(null);
    }
  }, [alerts, selectedAlert]);

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (filter === 'no-leidas') return !alert.read;
        if (filter === 'criticas') return alert.severity === 'critica';
        if (filter === 'accion') return alert.actionRequired;
        return true;
      }),
    [alerts, filter]
  );

  const unreadCount = alerts.filter((alert) => !alert.read).length;
  const criticalCount = alerts.filter((alert) => alert.severity === 'critica').length;
  const actionCount = alerts.filter((alert) => alert.actionRequired).length;

  const handleMarkAsRead = (id: string) => {
    setAlerts((current) =>
      current.map((alert) => (alert.id === id ? { ...alert, read: true } : alert))
    );
  };

  const handleArchive = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    setArchivedCount((current) => current + 1);
    if (selectedAlert?.id === id) {
      setSelectedAlert(null);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.max(
      0,
      Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    );

    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h atrás`;
    return `${Math.floor(diffMinutes / 1440)}d atrás`;
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Centro de Alertas</h1>
          <p className="mt-3 text-muted-foreground">
            Consolidación operativa de documentos, mantención, bodega y sostenibilidad.
          </p>
        </div>

        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>No fue posible cargar las alertas operativas.</span>
            </div>
            <Button variant="outline" onClick={() => mutate()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando alertas operativas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Centro de Alertas</h1>
          <p className="mt-3 text-muted-foreground">
            Consolidación operativa de documentos, mantención, bodega y sostenibilidad.
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alertas no leídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unreadCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{criticalCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">acción inmediata</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requieren acción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{actionCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">pendientes</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-secondary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Archivadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{archivedCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">resueltas en sesión</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-border pb-4">
        <Button variant={filter === 'todos' ? 'default' : 'ghost'} onClick={() => setFilter('todos')}>
          Todas ({alerts.length})
        </Button>
        <Button
          variant={filter === 'no-leidas' ? 'default' : 'ghost'}
          onClick={() => setFilter('no-leidas')}
        >
          No leídas ({unreadCount})
        </Button>
        <Button
          variant={filter === 'criticas' ? 'default' : 'ghost'}
          onClick={() => setFilter('criticas')}
          className="text-destructive"
        >
          Críticas ({criticalCount})
        </Button>
        <Button
          variant={filter === 'accion' ? 'default' : 'ghost'}
          onClick={() => setFilter('accion')}
        >
          Requieren acción ({actionCount})
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {filteredAlerts.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-secondary opacity-50" />
                <p className="text-muted-foreground">No hay alertas en esta categoría.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const SeverityIcon = config.icon;

              return (
                <Card
                  key={alert.id}
                  className={`cursor-pointer border-border transition-all ${
                    selectedAlert?.id === alert.id ? 'ring-2 ring-primary' : ''
                  } ${!alert.read ? 'bg-background' : ''}`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 pt-1">
                        <SeverityIcon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{alert.title}</h3>
                              {!alert.read && (
                                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--secondary)]" />
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge className={config.color}>{config.label}</Badge>
                              <Badge variant="outline">{typeLabel(alert.type)}</Badge>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatTime(alert.timestamp)}
                              </span>
                              {alert.actionRequired && (
                                <Badge variant="destructive">Requiere acción</Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-shrink-0 gap-2">
                            {alert.actionUrl && (
                              <Button size="sm" onClick={() => router.push(alert.actionUrl!)}>
                                Ir
                              </Button>
                            )}
                            {!alert.read && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsRead(alert.id)}
                              >
                                Marcar leída
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleArchive(alert.id)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {selectedAlert && (
          <div className="lg:col-span-1">
            <Card className="sticky top-20 border-[var(--brand-naranja)]/30 bg-[var(--brand-naranja)]/5">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>Detalle de alerta</CardTitle>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    x
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Título</p>
                  <p className="font-semibold text-foreground">{selectedAlert.title}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Descripción
                  </p>
                  <p className="text-sm text-foreground">{selectedAlert.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      Severidad
                    </p>
                    <Badge className={severityConfig[selectedAlert.severity].color}>
                      {severityConfig[selectedAlert.severity].label}
                    </Badge>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Tipo</p>
                    <Badge variant="outline">{typeLabel(selectedAlert.type)}</Badge>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Fecha</p>
                  <p className="text-sm text-foreground">
                    {new Date(selectedAlert.timestamp).toLocaleString('es-CL')}
                  </p>
                </div>

                <div className="pt-2">
                  {selectedAlert.actionUrl && (
                    <Button
                      asChild
                      className="w-full bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90"
                      onClick={() => setSelectedAlert(null)}
                    >
                      <Link href={selectedAlert.actionUrl}>Ir a {typeLabel(selectedAlert.type)}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
