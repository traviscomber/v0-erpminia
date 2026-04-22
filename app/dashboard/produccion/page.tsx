'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Gauge,
  Thermometer,
  Droplet,
  Wind,
  BarChart3,
  Plus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { CHART_COLORS_LIGHT } from '@/lib/theme-colors';

// Mock data for demonstration
const mockPlants = [
  {
    id: 'plant_01',
    name: 'Planta Principal',
    location: 'Antofagasta',
    status: 'operational',
    equipment_count: 24,
    availability: 94.5,
    active_alarms: 2,
    daily_production: 1250,
    daily_target: 1200,
  },
  {
    id: 'plant_02',
    name: 'Planta Concentradora',
    location: 'La Calera',
    status: 'operational',
    equipment_count: 18,
    availability: 89.2,
    active_alarms: 5,
    daily_production: 980,
    daily_target: 1000,
  },
];

const mockEquipment = [
  {
    id: 'eq_001',
    name: 'Excavadora CAT 390F',
    plant_id: 'plant_01',
    status: 'operational',
    temperature: 68,
    vibration: 2.1,
    pressure: 95,
    availability: 98,
    mtbf_hours: 720,
    last_maintenance: '2024-04-15',
    next_maintenance: '2024-05-15',
  },
  {
    id: 'eq_002',
    name: 'Molino SAG',
    plant_id: 'plant_01',
    status: 'warning',
    temperature: 78,
    vibration: 4.2,
    pressure: 110,
    availability: 91,
    mtbf_hours: 480,
    last_maintenance: '2024-04-10',
    next_maintenance: '2024-04-20',
  },
];

const mockAlarms = [
  {
    id: 'alarm_001',
    equipment_id: 'eq_002',
    type: 'high_vibration',
    severity: 'warning',
    value: 4.2,
    threshold: 3.5,
    timestamp: new Date(Date.now() - 30 * 60000),
    status: 'active',
  },
  {
    id: 'alarm_002',
    equipment_id: 'eq_003',
    type: 'high_temperature',
    severity: 'critical',
    value: 95,
    threshold: 85,
    timestamp: new Date(Date.now() - 45 * 60000),
    status: 'active',
  },
  {
    id: 'alarm_003',
    equipment_id: 'eq_001',
    type: 'low_pressure',
    severity: 'info',
    value: 45,
    threshold: 50,
    timestamp: new Date(Date.now() - 2 * 60 * 60000),
    status: 'resolved',
  },
];

const availabilityTrend = [
  { date: '15 Abr', plant1: 92, plant2: 88 },
  { date: '16 Abr', plant1: 93, plant2: 89 },
  { date: '17 Abr', plant1: 94, plant2: 87 },
  { date: '18 Abr', plant1: 95, plant2: 90 },
  { date: '19 Abr', plant1: 94, plant2: 89 },
  { date: '20 Abr', plant1: 94.5, plant2: 89.2 },
];

const sensorData = [
  { equipment: 'Excavadora', temp: 68, vib: 2.1, press: 95 },
  { equipment: 'Molino SAG', temp: 78, vib: 4.2, press: 110 },
  { equipment: 'Chancador', temp: 72, vib: 3.1, press: 105 },
  { equipment: 'Bomba', temp: 55, vib: 1.8, press: 88 },
];

export default function ProduccionPage() {
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [realTimeData, setRealTimeData] = useState(sensorData);

  // Simulate real-time sensor data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData((prev) =>
        prev.map((item) => ({
          ...item,
          temp: item.temp + (Math.random() - 0.5) * 2,
          vib: Math.max(1, item.vib + (Math.random() - 0.5) * 0.3),
          press: item.press + (Math.random() - 0.5) * 1,
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const activeAlarms = mockAlarms.filter((a) => a.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Producción</h1>
          <p className="text-muted-foreground mt-1">Monitoreo en tiempo real de plantas y equipos</p>
        </div>
        <Button className="gap-2" onClick={() => alert('Crear nueva planta próximamente')}>
          <Plus className="h-4 w-4" />
          Nueva Planta
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Disponibilidad Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">91.9%</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +0.8% vs última semana
            </p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Alarmas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{activeAlarms.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Producción Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2,230 t</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Sobre meta (+1.8%)
            </p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Equipos Monitoreados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">42</div>
            <p className="text-xs text-muted-foreground mt-1">Activos en tiempo real</p>
          </CardContent>
        </BrandCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Plants & Equipment */}
        <div className="lg:col-span-1 space-y-4">
          {/* Plants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plantas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockPlants.map((plant) => (
                <div
                  key={plant.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPlant === plant.id
                      ? 'border-[var(--brand-naranja)] bg-[var(--brand-naranja)]/5'
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => setSelectedPlant(plant.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{plant.name}</p>
                      <p className="text-xs text-muted-foreground">{plant.location}</p>
                    </div>
                    {getStatusIcon(plant.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Disponibilidad</span>
                      <div className="font-semibold text-green-600">{plant.availability}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Alarmas</span>
                      <div className="font-semibold text-red-600">{plant.active_alarms}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Equipment Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Equipos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockEquipment.map((eq) => (
                <div
                  key={eq.id}
                  className="p-2 rounded border border-border hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => setSelectedEquipment(eq.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-sm text-sm font-semibold line-clamp-1">{eq.name}</p>
                    </div>
                    {getStatusIcon(eq.status)}
                  </div>
                  <div className="flex gap-2 mt-1 text-xs">
                    <Badge variant="outline">{eq.availability}%</Badge>
                    <Badge variant="outline">{eq.temperature}°C</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Center: Charts */}
        <div className="lg:col-span-1 space-y-4">
          {/* Availability Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidad (Últimos 6 días)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={availabilityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} domain={[85, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="plant1"
                    stroke="#FF6B35"
                    name="Planta Principal"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="plant2"
                    stroke="#004E89"
                    name="Concentradora"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sensor Metrics Scatter */}
          <Card>
            <CardHeader>
              <CardTitle>Correlación: Vibración vs Temperatura</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="vib" name="Vibración (mm/s)" />
                  <YAxis type="number" dataKey="temp" name="Temperatura (°C)" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Equipos" data={realTimeData} fill="#FF6B35" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right: Alarms & Details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Active Alarms */}
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Alarmas Activas ({activeAlarms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {activeAlarms.map((alarm) => (
                <div key={alarm.id} className={`p-2 rounded border ${getSeverityColor(alarm.severity)}`}>
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-xs">{alarm.type.replace(/_/g, ' ').toUpperCase()}</p>
                    <Badge className="text-xs">{alarm.severity.toUpperCase()}</Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p>Valor: {alarm.value} | Límite: {alarm.threshold}</p>
                    <p className="text-muted-foreground">
                      Hace {Math.floor((Date.now() - alarm.timestamp.getTime()) / 60000)} min
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => alert('Crear OT de mantenimiento')}
                  >
                    Crear OT
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected Equipment Detail */}
          {selectedEquipment && mockEquipment.find((e) => e.id === selectedEquipment) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {mockEquipment.find((e) => e.id === selectedEquipment)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const eq = mockEquipment.find((e) => e.id === selectedEquipment);
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Temperatura</p>
                          <p className="font-semibold">{eq?.temperature}°C</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vibración</p>
                          <p className="font-semibold">{eq?.vibration} mm/s</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Presión</p>
                          <p className="font-semibold">{eq?.pressure} PSI</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Disponibilidad</p>
                          <p className="font-semibold text-green-600">{eq?.availability}%</p>
                        </div>
                      </div>
                      <div className="border-t pt-3 space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Último mantenimiento</p>
                          <p>{eq?.last_maintenance}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Próximo mantenimiento</p>
                          <p className="font-semibold">{eq?.next_maintenance}</p>
                        </div>
                      </div>
                      <Button className="w-full gap-2" asChild>
                        <Link href={`/dashboard/mantenimiento/equipos/${eq?.id}`}>
                          Ver Historial de Mantenimiento
                        </Link>
                      </Button>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
