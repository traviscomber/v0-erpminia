'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import { 
  Activity, 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  Clock, 
  Gauge,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS_LIGHT } from '@/lib/theme-colors';

export default function ProduccionPage() {
  const [plants, setPlants] = useState([
    { id: '1', name: 'Faena Centro', location: 'Atacama', status: 'operational', equipment_count: 42 },
    { id: '2', name: 'Planta Procesamiento', location: 'Atacama', status: 'operational', equipment_count: 28 },
  ]);

  const [selectedPlant, setSelectedPlant] = useState(plants[0]);

  const [equipment, setEquipment] = useState([
    {
      id: 'eq-01',
      name: 'Excavadora CAT 390',
      type: 'excavadora',
      status: 'operational',
      availability: 94,
      temperature: 62,
      pressure: 8.2,
      alarms: 1,
      last_maintenance: '2024-03-15',
    },
    {
      id: 'eq-02',
      name: 'Bomba Hidráulica P-4',
      type: 'bomba',
      status: 'operational',
      availability: 98,
      temperature: 45,
      pressure: 7.5,
      alarms: 0,
      last_maintenance: '2024-03-10',
    },
    {
      id: 'eq-03',
      name: 'Motor Eléctrico M-7',
      type: 'motor',
      status: 'warning',
      availability: 87,
      temperature: 78,
      pressure: 6.1,
      alarms: 2,
      last_maintenance: '2024-02-20',
    },
  ]);

  const [sensorData, setSensorData] = useState([
    { timestamp: '08:00', temp: 65, pressure: 8.0, vibration: 2.1 },
    { timestamp: '08:15', temp: 66, pressure: 8.1, vibration: 2.2 },
    { timestamp: '08:30', temp: 67, pressure: 8.2, vibration: 2.4 },
    { timestamp: '08:45', temp: 69, pressure: 8.3, vibration: 2.6 },
    { timestamp: '09:00', temp: 71, pressure: 8.5, vibration: 2.8 },
    { timestamp: '09:15', temp: 72, pressure: 8.6, vibration: 3.1 },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500/20 text-green-700';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'maintenance':
        return 'bg-blue-500/20 text-blue-700';
      case 'offline':
        return 'bg-red-500/20 text-red-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'offline':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Producción en Tiempo Real</h1>
        <p className="text-muted-foreground">Monitoreo integral de plantas, equipos y sensores</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Equipos Operacionales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">38/42</div>
            <p className="text-xs text-muted-foreground mt-1">90.5% disponibilidad</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Alarmas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-naranja)]">5</div>
            <p className="text-xs text-muted-foreground mt-1">2 críticas, 3 medias</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Producción Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2,847 t</div>
            <p className="text-xs text-muted-foreground mt-1">92% de meta</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Downtime Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">145 min</div>
            <p className="text-xs text-muted-foreground mt-1">3.2% del día</p>
          </CardContent>
        </BrandCard>
      </div>

      {/* Plants Selector */}
      <div className="flex gap-2 flex-wrap">
        {plants.map((plant) => (
          <Button
            key={plant.id}
            variant={selectedPlant.id === plant.id ? 'default' : 'outline'}
            onClick={() => setSelectedPlant(plant)}
            className={selectedPlant.id === plant.id ? 'bg-[var(--brand-naranja)]' : ''}
          >
            {plant.name}
          </Button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold">Equipos de {selectedPlant.name}</h2>
          {equipment.map((eq) => (
            <Card key={eq.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{eq.name}</h3>
                      <Badge className={getStatusColor(eq.status)}>
                        <span className="mr-1">{getStatusIcon(eq.status)}</span>
                        {eq.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Disponibilidad</p>
                        <p className="font-semibold">{eq.availability}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Temperatura</p>
                        <p className="font-semibold">{eq.temperature}°C</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Presión</p>
                        <p className="font-semibold">{eq.pressure} bar</p>
                      </div>
                    </div>
                  </div>
                  {eq.alarms > 0 && (
                    <div className="bg-[var(--brand-naranja)]/20 text-[var(--brand-naranja)] px-3 py-2 rounded-lg text-center">
                      <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                      <p className="text-xs font-semibold">{eq.alarms} alerta{eq.alarms > 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alarms Panel */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Alertas Activas</h2>
          <div className="space-y-2">
            {[
              { severity: 'critical', equipment: 'Motor M-7', message: 'Temperatura crítica', time: '09:15' },
              { severity: 'warning', equipment: 'Excavadora 390', message: 'Presión anómala', time: '08:42' },
              { severity: 'warning', equipment: 'Bomba P-4', message: 'Vibración alta', time: '08:30' },
            ].map((alert, i) => (
              <Card key={i} className={alert.severity === 'critical' ? 'border-[var(--brand-rojo)]/50 bg-[var(--brand-rojo)]/5' : 'border-[var(--brand-naranja)]/50 bg-[var(--brand-naranja)]/5'}>
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {alert.severity === 'critical' ? (
                      <AlertTriangle className="h-5 w-5 text-[var(--brand-rojo)] flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-[var(--brand-naranja)] flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{alert.equipment}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Sensor Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencias de Sensores (Últimas 2h)</CardTitle>
          <CardDescription>Temperatura, Presión y Vibración</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temp" stroke={CHART_COLORS_LIGHT[0]} name="Temp (°C)" />
              <Line type="monotone" dataKey="pressure" stroke={CHART_COLORS_LIGHT[1]} name="Presión (bar)" />
              <Line type="monotone" dataKey="vibration" stroke={CHART_COLORS_LIGHT[2]} name="Vibración (mm/s)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
