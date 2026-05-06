import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Wrench, AlertCircle, Clock, Activity } from 'lucide-react';

interface EquipmentDetail {
  id: string;
  name: string;
  model: string;
  serial: string;
  location: string;
  installation_date: Date;
  status: 'operational' | 'maintenance' | 'error';
  uptime_hours: number;
  total_operating_hours: number;
  last_maintenance: Date;
  next_maintenance: Date;
  maintenance_count: number;
  downtime_events: number;
}

interface MaintenanceHistory {
  date: Date;
  type: 'preventiva' | 'correctiva' | 'predictiva';
  description: string;
  hours: number;
  cost: number;
  technician: string;
}

interface EquipmentDetailCardProps {
  equipment: EquipmentDetail;
  maintenance_history: MaintenanceHistory[];
}

export function EquipmentDetailCard({ equipment, maintenance_history }: EquipmentDetailCardProps) {
  const uptime_percentage = (equipment.uptime_hours / equipment.total_operating_hours) * 100;

  const monthlyData = [
    { month: 'Sem 1', uptime: 99, events: 0 },
    { month: 'Sem 2', uptime: 98, events: 1 },
    { month: 'Sem 3', uptime: 97, events: 1 },
    { month: 'Sem 4', uptime: 96, events: 2 },
  ];

  const maintenanceByType = [
    { type: 'Preventiva', count: maintenance_history.filter(m => m.type === 'preventiva').length },
    { type: 'Correctiva', count: maintenance_history.filter(m => m.type === 'correctiva').length },
    { type: 'Predictiva', count: maintenance_history.filter(m => m.type === 'predictiva').length },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{equipment.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {equipment.model} | S/N: {equipment.serial}
              </p>
            </div>
            <Badge className={
              equipment.status === 'operational' ? 'bg-green-100 text-green-800' :
              equipment.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }>
              {equipment.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ubicación</p>
              <p className="text-sm font-medium">{equipment.location}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Instalado</p>
              <p className="text-sm font-medium">{equipment.installation_date.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Horas Operativas</p>
              <p className="text-sm font-medium">{equipment.total_operating_hours.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Disponibilidad</p>
              <p className="text-sm font-medium">{uptime_percentage.toFixed(1)}%</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Disponibilidad General</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${uptime_percentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Métricas de Operación</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="uptime" stroke="#10b981" name="Disponibilidad %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Eventos de Downtime</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">Total eventos: {equipment.downtime_events}</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="events" fill="#ef4444" name="Eventos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Historial de Mantenimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Próximo Mantenimiento</p>
                  <p className="text-sm font-medium">{equipment.next_maintenance.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Intervenciones</p>
                  <p className="text-sm font-medium">{equipment.maintenance_count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Días Hasta Próximo</p>
                  <p className="text-sm font-medium">
                    {Math.ceil((equipment.next_maintenance.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-2">Últimas Intervenciones</p>
                <div className="space-y-2">
                  {maintenance_history.slice(0, 5).map((maint, idx) => (
                    <div key={idx} className="p-2 border rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{maint.type}</span>
                        <Badge variant="outline" className="text-xs">{maint.date.toLocaleDateString()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{maint.description}</p>
                      <p className="text-xs mt-1">Horas: {maint.hours} | Costo: CLP {maint.cost.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
