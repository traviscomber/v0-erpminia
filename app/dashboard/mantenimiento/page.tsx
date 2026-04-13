'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Wrench,
  Search,
  AlertCircle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MaintenanceOrder {
  id: string;
  asset_name: string;
  asset_id: string;
  order_type: 'preventiva' | 'correctiva' | 'predictiva';
  status: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
  scheduled_date: string;
  completion_date?: string;
  technician: string;
  priority: 'baja' | 'media' | 'alta' | 'critica_seguridad';
  estimated_mttr?: number; // minutes
  actual_mttr?: number; // minutes
  failure_code?: string;
  preventive_score?: number; // 0-100
  safety_critical?: boolean;
}

export default function MantenimientoPage() {
  const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setLoading(false);
  }, []);

  const preventiveOrders = orders.filter(o => o.order_type === 'preventiva').length;
  const correctiveOrders = orders.filter(o => o.order_type === 'correctiva').length;
  const predictiveOrders = orders.filter(o => o.order_type === 'predictiva').length;
  const completedOrders = orders.filter(o => o.status === 'completada').length;
  const pendingOrders = orders.filter(o => o.status === 'pendiente').length;
  const safetyOrders = orders.filter(o => o.priority === 'critica_seguridad').length;

  // Calculate MTBF/MTTR metrics
  const avgMTTR = orders.filter(o => o.actual_mttr).length > 0
    ? Math.round(orders.filter(o => o.actual_mttr).reduce((sum, o) => sum + (o.actual_mttr || 0), 0) / orders.filter(o => o.actual_mttr).length)
    : 0;

  // Calculate equipment availability
  const totalDowntime = orders.filter(o => o.status === 'completada').reduce((sum, o) => sum + (o.actual_mttr || 0), 0);
  const availability = orders.length > 0 ? Math.round((1 - (totalDowntime / (30 * 24 * 60))) * 100) : 100;

  const statusColors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    en_progreso: 'bg-blue-100 text-blue-800',
    completada: 'bg-green-100 text-green-800',
    cancelada: 'bg-gray-100 text-gray-800',
  };

  const priorityColors: Record<string, string> = {
    baja: 'bg-gray-100 text-gray-800',
    media: 'bg-yellow-100 text-yellow-800',
    alta: 'bg-orange-100 text-orange-800',
    critica_seguridad: 'bg-red-100 text-red-800 font-bold',
  };

  const chartData = [
    { name: 'Preventivas', value: preventiveOrders },
    { name: 'Correctivas', value: correctiveOrders },
    { name: 'Predictivas', value: predictiveOrders },
  ];

  const COLORS = ['#3b82f6', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Gestión de Mantenimiento</h1>
            <p className="text-muted-foreground mt-3">
              Órdenes preventivas/predictivas, MTBF/MTTR, seguridad crítica y disponibilidad de equipos
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-chart-1/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Órdenes Totales
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground mt-2">{completedOrders} completadas</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-red-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Seguridad Crítica
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-red-600">{safetyOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">órdenes de seguridad</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-blue-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MTTR Promedio
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-blue-600">{avgMTTR}m</div>
            <p className="text-xs text-muted-foreground mt-2">tiempo a reparación</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Disponibilidad
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-600">{availability}%</div>
            <p className="text-xs text-muted-foreground mt-2">equipos operacionales</p>
          </CardContent>
        </Card>
      </div>
        <Card className="border-border overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-chart-1/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Órdenes Totales
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground mt-2">en el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-blue-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preventivas
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-blue-600">{preventiveOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">mantenimiento planeado</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-red-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Correctivas
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-red-600">{correctiveOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">respuestas a fallas</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-green-500/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completadas
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-600">{completedOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">órdenes finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Distribución de Órdenes</CardTitle>
            <CardDescription>Preventivas vs Correctivas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-border">
              {chartData.map((item, idx) => (
                <div key={item.name} className="text-center">
                  <div
                    className="w-2 h-2 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: COLORS[idx] }}
                  />
                  <p className="text-xs font-medium text-muted-foreground">{item.name}</p>
                  <p className="text-sm font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analytics Card */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Análisis de Disponibilidad</CardTitle>
            <CardDescription>Indicadores clave de mantenimiento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Órdenes Pendientes</span>
                <span className="text-2xl font-bold text-yellow-600">{pendingOrders}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{
                    width: `${orders.length > 0 ? (pendingOrders / orders.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Órdenes Completadas</span>
                <span className="text-2xl font-bold text-green-600">{completedOrders}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${orders.length > 0 ? (completedOrders / orders.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Tasa de Cumplimiento: {orders.length > 0 ? ((completedOrders / orders.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Orders Table */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Órdenes de Mantenimiento</CardTitle>
              <CardDescription>Administra todas las órdenes del sistema</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar orden..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_progreso">En Progreso</SelectItem>
                  <SelectItem value="completada">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando órdenes...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No hay órdenes registradas</p>
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Crear primera orden
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Activo</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Tipo</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Estado</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Técnico</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Fecha Programada</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-3 px-4 font-medium">{order.asset_name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {order.order_type === 'preventiva' ? 'Preventiva' : 'Correctiva'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[order.status] || ''}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{order.technician}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(order.scheduled_date).toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
