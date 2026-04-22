'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  ArrowRight,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Shield,
  Package,
  Wrench,
  DollarSign,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sankey,
  Sink,
  Source,
  Link as SankeyLink,
} from 'recharts';

interface Module {
  name: string;
  status: 'operational' | 'warning' | 'critical';
  key_metric: number;
  metric_label: string;
  icon: any;
  color: string;
}

const modules: Module[] = [
  {
    name: 'Producción',
    status: 'operational',
    key_metric: 91.9,
    metric_label: 'Disponibilidad %',
    icon: Activity,
    color: 'text-blue-500',
  },
  {
    name: 'Mantenimiento',
    status: 'operational',
    key_metric: 48,
    metric_label: 'OT Activas',
    icon: Wrench,
    color: 'text-orange-500',
  },
  {
    name: 'Inventario',
    status: 'warning',
    key_metric: 7,
    metric_label: 'Bajo Stock',
    icon: Package,
    color: 'text-yellow-500',
  },
  {
    name: 'Finanzas',
    status: 'operational',
    key_metric: 2.3,
    metric_label: 'M USD Gastado Mes',
    icon: DollarSign,
    color: 'text-green-500',
  },
  {
    name: 'HSE',
    status: 'warning',
    key_metric: 83.5,
    metric_label: 'Score Cumplimiento %',
    icon: Shield,
    color: 'text-red-500',
  },
];

const eventFlow = [
  {
    id: 1,
    source: 'Producción',
    event: 'Sensor Alarm',
    target: 'Mantenimiento',
    time: '14:32',
  },
  {
    id: 2,
    source: 'Mantenimiento',
    event: 'OT Created',
    target: 'Inventario',
    time: '14:33',
  },
  {
    id: 3,
    source: 'Inventario',
    event: 'PO Generated',
    target: 'Finanzas',
    time: '14:34',
  },
  {
    id: 4,
    source: 'Finanzas',
    event: 'Cost Calculated',
    target: 'HSE',
    time: '14:35',
  },
];

const integratedProcessData = [
  { step: 'Sensor Alarm', produccion: 1, time: 0 },
  { step: 'Alert Triggered', produccion: 1, mantenimiento: 1, time: 1 },
  { step: 'OT Created', mantenimiento: 1, inventario: 1, time: 2 },
  { step: 'Stock Updated', inventario: 1, finanzas: 1, time: 3 },
  { step: 'Cost Calc', finanzas: 1, hse: 1, time: 4 },
  { step: 'Closed', hse: 1, time: 5 },
];

export default function IntegratedDashboard() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showFlow, setShowFlow] = useState(true);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500/20 text-green-700';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'critical':
        return 'bg-red-500/20 text-red-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Ejecutivo Integrado</h1>
          <p className="text-muted-foreground mt-1">Visión unificada de todos los módulos y sus integraciones</p>
        </div>
        <Button variant="outline" onClick={() => setShowFlow(!showFlow)}>
          <Eye className="h-4 w-4 mr-2" />
          {showFlow ? 'Ocultar' : 'Mostrar'} Flujos
        </Button>
      </div>

      {/* Module Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {modules.map((module) => (
          <BrandCard
            key={module.name}
            className={`cursor-pointer transition-all ${selectedModule === module.name ? 'ring-2 ring-[var(--brand-naranja)]' : ''}`}
            onClick={() => setSelectedModule(selectedModule === module.name ? null : module.name)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-sm">{module.name}</CardTitle>
                {getStatusIcon(module.status)}
              </div>
              <Badge className={getStatusColor(module.status)} variant="outline">
                {module.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{module.key_metric}</div>
              <p className="text-xs text-muted-foreground">{module.metric_label}</p>
            </CardContent>
          </BrandCard>
        ))}
      </div>

      {/* Integration Flow - How events cascade */}
      {showFlow && (
        <Card className="border-[var(--brand-naranja)]/30 bg-[var(--brand-naranja)]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Flujo de Integración en Tiempo Real
            </CardTitle>
            <CardDescription>
              Últimos eventos que han cascadeado automáticamente entre módulos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventFlow.map((event, idx) => (
                <div key={event.id} className="flex items-center gap-4">
                  <div className="text-xs font-semibold text-muted-foreground w-16">{event.time}</div>

                  <div className="flex-1 flex items-center gap-3">
                    {/* Source Module */}
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[var(--brand-naranja)]/20 flex items-center justify-center text-xs font-semibold">
                        {event.source.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold">{event.source}</span>
                    </div>

                    {/* Event Badge */}
                    <Badge variant="outline" className="bg-[var(--brand-naranja)]/10">
                      {event.event}
                    </Badge>

                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                    {/* Target Module */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{event.target}</span>
                      <div className="h-8 w-8 rounded-full bg-[var(--brand-verde)]/20 flex items-center justify-center text-xs font-semibold">
                        {event.target.charAt(0)}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cross-Module Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Operaciones que Cruzaron Módulos Hoy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  id: 1,
                  title: 'Molino SAG - Vibración Alta',
                  cascade: 'Producción → Mantenimiento → Inventario → Finanzas',
                  status: 'completed',
                  time: '14:35',
                },
                {
                  id: 2,
                  title: 'Stock Bajo - Repuesto Crítico',
                  cascade: 'Inventario → Compras → Finanzas → HSE',
                  status: 'completed',
                  time: '11:20',
                },
                {
                  id: 3,
                  title: 'Incidente de Seguridad Reportado',
                  cascade: 'HSE → Mantenimiento → Documentos',
                  status: 'in_progress',
                  time: '09:45',
                },
              ].map((op) => (
                <div key={op.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-sm">{op.title}</p>
                    <Badge
                      className={
                        op.status === 'completed'
                          ? 'bg-green-500/20 text-green-700'
                          : 'bg-blue-500/20 text-blue-700'
                      }
                      variant="outline"
                    >
                      {op.status === 'completed' ? 'Completada' : 'En Progreso'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{op.cascade}</p>
                  <p className="text-xs text-muted-foreground">{op.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integration Health */}
        <Card>
          <CardHeader>
            <CardTitle>Salud de Integraciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                name: 'Producción ↔ Mantenimiento',
                health: 99.8,
                events: 1247,
              },
              {
                name: 'Mantenimiento ↔ Inventario',
                health: 98.5,
                events: 523,
              },
              {
                name: 'Inventario ↔ Finanzas',
                health: 99.2,
                events: 312,
              },
              {
                name: 'Finanzas ↔ HSE',
                health: 97.1,
                events: 156,
              },
            ].map((integration, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold">{integration.name}</p>
                  <span className="text-xs text-muted-foreground">{integration.events} eventos</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${integration.health}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{integration.health}% uptime</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Event Cascade Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Ejemplo de Cascada: Sensor Alarm → Cierre Completo</CardTitle>
          <CardDescription>
            Cómo un evento en Producción genera automáticamente acciones en todos los módulos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                step: 1,
                module: 'Producción',
                event: 'Sensor detecta vibración alta',
                action: 'Alarm creada',
                time: 'T+0s',
              },
              {
                step: 2,
                module: 'Mantenimiento',
                event: 'Orden automática creada',
                action: 'OT prioritaria asignada',
                time: 'T+2s',
              },
              {
                step: 3,
                module: 'Inventario',
                event: 'Piezas reservadas',
                action: 'Stock actualizado',
                time: 'T+4s',
              },
              {
                step: 4,
                module: 'Finanzas',
                event: 'Costo calculado',
                action: 'Impacto registrado',
                time: 'T+6s',
              },
              {
                step: 5,
                module: 'HSE',
                event: 'Observación creada',
                action: 'Riesgo documentado',
                time: 'T+8s',
              },
            ].map((cascade) => (
              <div key={cascade.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-[var(--brand-naranja)] text-white flex items-center justify-center font-bold text-sm">
                    {cascade.step}
                  </div>
                  {cascade.step < 5 && <div className="w-0.5 h-8 bg-[var(--brand-naranja)]/30 my-1" />}
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{cascade.module}</p>
                    <p className="text-xs text-muted-foreground">{cascade.time}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{cascade.event}</p>
                  <Badge variant="outline" className="text-xs">
                    {cascade.action}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Producción', href: '/dashboard/produccion', icon: Activity },
          { label: 'Mantenimiento', href: '/dashboard/mantenimiento', icon: Wrench },
          { label: 'Inventario', href: '/dashboard/bodega', icon: Package },
          { label: 'Finanzas', href: '/dashboard/finanzas', icon: BarChart3 },
          { label: 'HSE', href: '/dashboard/hse', icon: Shield },
        ].map((link) => (
          <Link key={link.label} href={link.href}>
            <Button variant="outline" className="w-full gap-2">
              <link.icon className="h-4 w-4" />
              <span className="text-xs">{link.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
