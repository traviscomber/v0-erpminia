'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Filter,
  Archive,
  Trash2,
} from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critica' | 'alta' | 'media' | 'baja' | 'info';
  type: 'documento' | 'mantenimiento' | 'inventario' | 'sistema';
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'Documento vencido - Crítico',
    description: 'Certificado ISO 9001 venció el 10/04/2026. Requiere renovación inmediata.',
    severity: 'critica',
    type: 'documento',
    timestamp: '2026-04-13T09:15:00',
    read: false,
    actionRequired: true,
    actionUrl: '/dashboard/documentos-v2',
  },
  {
    id: '2',
    title: 'Orden de mantenimiento crítica - Equipo parado',
    description: 'Molino SAG-01 sin disponibilidad hace 4 horas. MTTR actual: 240 min',
    severity: 'critica',
    type: 'mantenimiento',
    timestamp: '2026-04-13T08:45:00',
    read: false,
    actionRequired: true,
    actionUrl: '/dashboard/mantenimiento',
  },
  {
    id: '3',
    title: 'Stock crítico - Repuestos minería',
    description: 'Correas de transmisión por debajo de stock mínimo. Inventario: 2 unidades',
    severity: 'alta',
    type: 'inventario',
    timestamp: '2026-04-13T08:20:00',
    read: false,
    actionRequired: true,
    actionUrl: '/dashboard/bodega',
  },
  {
    id: '4',
    title: 'Aprobación pendiente - Orden de compra',
    description: 'OC #2024-1245 pendiente aprobación del Director. Monto: CLP $4.5M',
    severity: 'media',
    type: 'documento',
    timestamp: '2026-04-13T07:30:00',
    read: true,
    actionRequired: true,
    actionUrl: '/dashboard/documentos-v2',
  },
  {
    id: '5',
    title: 'Mantenimiento preventivo próximo',
    description: 'Bomba de agua requiere mantenimiento preventivo en 3 días. Programar ahora.',
    severity: 'media',
    type: 'mantenimiento',
    timestamp: '2026-04-13T06:15:00',
    read: true,
    actionRequired: false,
  },
  {
    id: '6',
    title: 'Conteo cíclico completado',
    description: 'Conteo cíclico Bodega Central completado. 98.2% exactitud. Varianza: 0.8%',
    severity: 'info',
    type: 'inventario',
    timestamp: '2026-04-12T16:45:00',
    read: true,
    actionRequired: false,
  },
];

const severityConfig = {
  critica: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle, label: 'Crítica' },
  alta: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle, label: 'Alta' },
  media: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle, label: 'Media' },
  baja: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info, label: 'Baja' },
  info: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Info, label: 'Info' },
};

export default function AlertasPage() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [filter, setFilter] = useState<'todos' | 'no-leidas' | 'criticas' | 'accion'>('todos');
  const [archivedCount, setArchivedCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'no-leidas') return !alert.read;
    if (filter === 'criticas') return alert.severity === 'critica';
    if (filter === 'accion') return alert.actionRequired;
    return true;
  });

  const unreadCount = alerts.filter(a => !a.read).length;
  const criticalCount = alerts.filter(a => a.severity === 'critica').length;
  const actionCount = alerts.filter(a => a.actionRequired).length;

  const handleMarkAsRead = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const handleArchive = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
    setArchivedCount(archivedCount + 1);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h atrás`;
    return `${Math.floor(diffMinutes / 1440)}d atrás`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Centro de Alertas</h1>
        <p className="text-muted-foreground mt-3">
          Sistema inteligente de notificaciones en tiempo real. Supervisión de todos los módulos.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alertas No Leídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unreadCount}</div>
            <p className="text-xs text-muted-foreground mt-1">requieren atención</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">acción inmediata</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requieren Acción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{actionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">pendientes</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Archivadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{archivedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">resueltas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 border-b border-border pb-4">
        <Button
          variant={filter === 'todos' ? 'default' : 'ghost'}
          onClick={() => setFilter('todos')}
        >
          Todas ({alerts.length})
        </Button>
        <Button
          variant={filter === 'no-leidas' ? 'default' : 'ghost'}
          onClick={() => setFilter('no-leidas')}
          className="gap-2"
        >
          No leídas ({unreadCount})
        </Button>
        <Button
          variant={filter === 'criticas' ? 'default' : 'ghost'}
          onClick={() => setFilter('criticas')}
          className="gap-2 text-red-600"
        >
          Críticas ({criticalCount})
        </Button>
        <Button
          variant={filter === 'accion' ? 'default' : 'ghost'}
          onClick={() => setFilter('accion')}
        >
          Requieren Acción ({actionCount})
        </Button>
      </div>

      {/* Main Content with Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600 opacity-50" />
              <p className="text-muted-foreground">No hay alertas en esta categoría</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const SeverityIcon = severityConfig[alert.severity].icon;
            const severityClass = severityConfig[alert.severity].color;

            return (
              <Card
                key={alert.id}
                className={`border-border transition-all cursor-pointer ${!alert.read ? 'bg-accent' : ''} ${selectedAlert?.id === alert.id ? 'ring-2 ring-[var(--brand-naranja)]' : ''}`}
                onClick={() => setSelectedAlert(alert)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <SeverityIcon className={`h-5 w-5 ${severityConfig[alert.severity].color.split(' ')[1]}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{alert.title}</h3>
                            {!alert.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={severityClass}>
                              {severityConfig[alert.severity].label}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(alert.timestamp)}
                            </span>
                            {alert.actionRequired && (
                              <Badge variant="destructive">Requiere Acción</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          {alert.actionUrl && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => window.location.href = alert.actionUrl}
                            >
                              Ir
                            </Button>
                          )}
                          {!alert.read && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(alert.id)}
                            >
                              Marcar leído
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

        {/* Detail Panel */}
        {selectedAlert && (
          <div className="lg:col-span-1">
            <Card className="border-[var(--brand-naranja)]/30 bg-[var(--brand-naranja)]/5 sticky top-20">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>Detalles de Alerta</CardTitle>
                  <button onClick={() => setSelectedAlert(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Título</p>
                  <p className="font-semibold text-foreground">{selectedAlert.title}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Descripción</p>
                  <p className="text-sm text-foreground">{selectedAlert.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Severidad</p>
                    <Badge className={severityConfig[selectedAlert.severity].color}>
                      {severityConfig[selectedAlert.severity].label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Tipo</p>
                    <Badge variant="outline">{selectedAlert.type}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Fecha</p>
                  <p className="text-sm text-foreground">{new Date(selectedAlert.timestamp).toLocaleString('es-CL')}</p>
                </div>

                <div className="pt-2">
                  {selectedAlert.actionUrl && (
                    <Button asChild className="w-full bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90" onClick={() => {
                      setSelectedAlert(null);
                    }}>
                      <Link href={selectedAlert.actionUrl}>
                        Ir a {selectedAlert.type === 'documento' ? 'Documentos' : selectedAlert.type === 'mantenimiento' ? 'Mantenimiento' : 'Bodega'}
                      </Link>
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
