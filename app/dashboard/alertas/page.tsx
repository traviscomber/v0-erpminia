'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Clock, Archive, RefreshCw, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardDescription } from '@/components/ui/card';
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

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

const severityConfig = {
  critica: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle, label: 'Critica' },
  alta: { color: 'bg-primary/10 text-primary border-primary/20', icon: AlertCircle, label: 'Alta' },
  media: { color: 'bg-primary/10 text-primary border-primary/20', icon: AlertCircle, label: 'Media' },
  baja: { color: 'bg-muted text-muted-foreground border-muted', icon: Info, label: 'Baja' },
  info: { color: 'bg-muted text-muted-foreground border-muted', icon: Info, label: 'Info' },
} as const;

function typeLabel(type: AlertType) {
  switch (type) {
    case 'documento':
      return 'Documentos';
    case 'mantenimiento':
      return 'Mantencion';
    case 'inventario':
      return 'Bodega';
    case 'sostenibilidad':
      return 'Sostenibilidad';
    case 'contrato':
      return 'Legal';
    default:
      return 'Modulo';
  }
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m atras`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h atras`;
  return `${Math.floor(diffMinutes / 1440)}d atras`;
}

export default function AlertasPage() {
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
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)));
  };

  const handleArchive = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    setArchivedCount((current) => current + 1);
    if (selectedAlert?.id === id) setSelectedAlert(null);
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Centro de Alertas</h1>
          <p className="mt-3 text-muted-foreground">
            Consolidacion operativa de documentos, mantencion, bodega y sostenibilidad.
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
            Consolidacion operativa de documentos, mantencion, bodega y sostenibilidad.
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
            <CardTitle className="text-sm font-medium">Alertas no leidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unreadCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">requieren atencion</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Criticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{criticalCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">accion inmediata</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Archive className="h-4 w-4 text-primary" />
              Requieren accion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{actionCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">con seguimiento pendiente</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Archivadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{archivedCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">en esta sesion</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accesos rapidos</CardTitle>
          <CardDescription>Rutas utiles para resolver alertas sin salir del flujo operativo.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/gerencial">
              Mantenimiento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/telemetria">
              Telemetria
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/bodega">
              Bodega
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/documentos-gestion">
              Gestion documental
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/legal/documentos">
              Documentos legales
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Alertas operativas</CardTitle>
          <div className="flex flex-wrap gap-2">
            {[
              ['todos', 'Todas'],
              ['no-leidas', 'No leidas'],
              ['criticas', 'Criticas'],
              ['accion', 'Con accion'],
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
        <CardContent className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No hay alertas para este filtro.
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-4 ${alert.read ? 'bg-background' : 'bg-muted/30'}`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className={`mt-0.5 rounded-full border p-2 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{alert.title}</h3>
                          <Badge variant="outline">{config.label}</Badge>
                          <Badge variant="outline">{typeLabel(alert.type)}</Badge>
                          {!alert.read && <Badge className="bg-primary/10 text-primary">Nueva</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(alert.timestamp)}
                          </span>
                          {alert.actionRequired && <span>Requiere accion</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(alert.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Marcar leida
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={alert.actionUrl}>Ver</Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleArchive(alert.id)}>
                        Archivar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
