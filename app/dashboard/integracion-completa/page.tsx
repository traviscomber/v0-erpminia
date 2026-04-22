'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle, Zap, Shield, Wrench, Package, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BrandCard } from '@/components/ui/brand-card';

export default function IntegracionCompletaPage() {
  const [selectedFlow, setSelectedFlow] = useState<'sensor' | 'incident' | 'compliance' | null>(null);

  // Real-time cascade example
  const cascadeFlow = {
    sensor: [
      { module: 'Producción', icon: Zap, status: 'Sensor detecta vibración', time: '14:32:15' },
      { module: 'HSE', icon: Shield, status: 'Alerta crítica generada', time: '14:32:16' },
      { module: 'Mantención', icon: Wrench, status: 'OT correctiva creada', time: '14:32:17' },
      { module: 'Bodega', icon: Package, status: 'Repuestos reservados', time: '14:32:18' },
      { module: 'Finanzas', icon: DollarSign, status: 'Costo estimado: $45K', time: '14:32:19' },
    ]
  };

  const kpis = [
    { label: 'Equipos Monitoreados', value: '47', trend: '+3' },
    { label: 'Alertas Activas', value: '12', trend: '-2' },
    { label: 'OT en Progreso', value: '8', trend: '+1' },
    { label: 'Requisitos Activos', value: '156', trend: '+5' },
  ];

  const integrationMetrics = [
    { name: 'Ene', produccion: 85, mantencion: 78, bodega: 92, hse: 88, finanzas: 81 },
    { name: 'Feb', produccion: 88, mantencion: 82, bodega: 94, hse: 90, finanzas: 84 },
    { name: 'Mar', produccion: 92, mantencion: 88, bodega: 96, hse: 93, finanzas: 89 },
    { name: 'Abr', produccion: 95, mantencion: 91, bodega: 97, hse: 95, finanzas: 92 },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Integración Completa ERP SegurIA</h1>
        <p className="text-muted-foreground">Flujos de datos en cascada entre 5 módulos operacionales</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <BrandCard key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
              <p className="text-xs text-green-600 mt-1">{kpi.trend} este mes</p>
            </CardContent>
          </BrandCard>
        ))}
      </div>

      {/* Cascade Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Cascada de Eventos en Tiempo Real</CardTitle>
          <CardDescription>Ejemplo: Sensor detecta anomalía → Flujo automático</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cascadeFlow.sensor.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 min-w-fit">
                    <Icon className="h-5 w-5 text-[var(--brand-naranja)]" />
                    <span className="font-semibold">{step.module}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{step.status}</p>
                    <p className="text-xs text-muted-foreground">{step.time}</p>
                  </div>
                  {idx < cascadeFlow.sensor.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Module Integration Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Salud de Integración por Módulo</CardTitle>
          <CardDescription>Porcentaje de eventos procesados exitosamente</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={integrationMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="produccion" stroke="#ff6b35" name="Producción" />
              <Line type="monotone" dataKey="mantencion" stroke="#004e89" name="Mantención" />
              <Line type="monotone" dataKey="bodega" stroke="#1b998b" name="Bodega" />
              <Line type="monotone" dataKey="hse" stroke="#d62828" name="HSE" />
              <Line type="monotone" dataKey="finanzas" stroke="#f77f00" name="Finanzas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Architecture Documentation */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Modelo de Datos Compartido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Entidades Centrales:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Equipos (Activos minería)</li>
              <li>Sensores (Telemetría en vivo)</li>
              <li>Órdenes de Mantención (OT)</li>
              <li>Incidentes (Problemas reportados)</li>
              <li>Requisitos (Requerimientos normativos)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Motor de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Triggers Automáticos:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sensor fuera rango → Alerta HSE</li>
              <li>Alerta crítica → OT Mantención</li>
              <li>OT → Reserva Bodega</li>
              <li>Consumo → Actualiza Finanzas</li>
              <li>Cierre → Reporte Compliance</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
