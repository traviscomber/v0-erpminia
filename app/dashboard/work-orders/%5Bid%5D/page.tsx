'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Clock, User, DollarSign, Wrench } from 'lucide-react';

// Mock data - en producción vendría de la BD
const mockMainOT = {
  id: 'OT-2026-001',
  vehicleCode: 'EXC-001',
  vehicleName: 'Excavadora CAT 390F',
  type: 'preventive',
  priority: 'high',
  status: 'in_progress',
  createdDate: '2026-01-15',
  description: 'Mantenimiento preventivo mensual',
  totalHours: 13,
  completedHours: 4,
  estimatedCost: 85000,
  spentCost: 25000,
  progress: 31,
  subOTs: [
    {
      id: 'OT-2026-001-MOTOR',
      level: 1,
      component: 'Sistema Motor y Transmisión',
      code: 'EXC-MOTOR',
      status: 'completed',
      assignedTo: 'Juan Pérez',
      estimatedHours: 4,
      completedHours: 4,
      estimatedCost: 35000,
      spentCost: 35000,
      progress: 100,
      tasks: [
        { id: 1, name: 'Cambiar filtro de aire', status: 'completed', cost: 5000 },
        { id: 2, name: 'Revisar presión inyectores', status: 'completed', cost: 8000 },
        { id: 3, name: 'Limpiar radiador', status: 'completed', cost: 12000 },
        { id: 4, name: 'Cambiar correa de distribución', status: 'completed', cost: 10000 }
      ],
      wearParts: [
        { id: 1, name: 'Filtro de aire', code: 'PART-001', qty: 1, unitCost: 5000 },
        { id: 2, name: 'Correa de distribución', code: 'PART-002', qty: 1, unitCost: 10000 }
      ]
    },
    {
      id: 'OT-2026-001-HIDRAULICO',
      level: 1,
      component: 'Sistema Hidráulico',
      code: 'EXC-HIDRAULICO',
      status: 'in_progress',
      assignedTo: 'Carlos López',
      estimatedHours: 3,
      completedHours: 0,
      estimatedCost: 25000,
      spentCost: 0,
      progress: 0,
      tasks: [
        { id: 1, name: 'Revisar presión hidráulica', status: 'pending', cost: 0 },
        { id: 2, name: 'Cambiar filtro hidráulico', status: 'pending', cost: 8000 },
        { id: 3, name: 'Inspeccionar cilindros', status: 'pending', cost: 12000 }
      ],
      wearParts: [
        { id: 1, name: 'Filtro hidráulico', code: 'PART-003', qty: 1, unitCost: 8000 }
      ]
    },
    {
      id: 'OT-2026-001-ENFRIAMIENTO',
      level: 1,
      component: 'Sistema de Enfriamiento',
      code: 'EXC-ENFRIAMIENTO',
      status: 'pending',
      assignedTo: 'Pendiente asignación',
      estimatedHours: 2,
      completedHours: 0,
      estimatedCost: 15000,
      spentCost: 0,
      progress: 0,
      tasks: [
        { id: 1, name: 'Revisar coolant', status: 'pending', cost: 0 },
        { id: 2, name: 'Limpiar radiador secundario', status: 'pending', cost: 5000 }
      ],
      wearParts: []
    }
  ]
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'pending': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed': return 'Completada';
    case 'in_progress': return 'En Progreso';
    case 'pending': return 'Pendiente';
    default: return status;
  }
};

interface SubOTProps {
  subOT: typeof mockMainOT.subOTs[0];
  expanded: boolean;
  onToggle: () => void;
}

function SubOTCard({ subOT, expanded, onToggle }: SubOTProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        onClick={onToggle}
        className="p-4 bg-muted/50 hover:bg-muted cursor-pointer flex items-start justify-between"
      >
        <div className="flex items-start gap-3 flex-1">
          {expanded ? <ChevronDown className="w-5 h-5 mt-1" /> : <ChevronRight className="w-5 h-5 mt-1" />}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{subOT.component}</h4>
              <Badge variant="outline">{subOT.code}</Badge>
              <Badge className={getStatusColor(subOT.status)}>{getStatusLabel(subOT.status)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Asignado a: {subOT.assignedTo}</p>
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="text-sm font-semibold">{subOT.progress}% completada</p>
          <p className="text-xs text-muted-foreground">{subOT.completedHours}h/{subOT.estimatedHours}h</p>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4 border-t">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Progreso</p>
            <Progress value={subOT.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{subOT.completedHours}h completadas</span>
              <span>{subOT.estimatedHours}h totales</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Costo gastado</p>
                <p className="font-semibold">${subOT.spentCost.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tiempo</p>
                <p className="font-semibold">{subOT.estimatedHours}h</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Tareas ({subOT.tasks.length})</p>
            {subOT.tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-2 bg-accent/50 rounded">
                {task.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <div className="flex-1">
                  <p className="text-sm">{task.name}</p>
                </div>
                <Badge variant="outline" className="text-xs">${task.cost.toLocaleString()}</Badge>
              </div>
            ))}
          </div>

          {subOT.wearParts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Piezas de Desgaste ({subOT.wearParts.length})</p>
              {subOT.wearParts.map(part => (
                <div key={part.id} className="flex items-center justify-between p-2 bg-accent/50 rounded text-sm">
                  <div>
                    <p className="font-medium">{part.name}</p>
                    <p className="text-xs text-muted-foreground">{part.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${part.unitCost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Qty: {part.qty}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const [expandedSubOTs, setExpandedSubOTs] = useState<string[]>([]);

  const toggleSubOT = (id: string) => {
    setExpandedSubOTs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{mockMainOT.id}</h1>
          <p className="text-muted-foreground">{mockMainOT.vehicleName}</p>
        </div>
        <Badge className={`${getStatusColor(mockMainOT.status)} text-lg px-3 py-1`}>
          {getStatusLabel(mockMainOT.status)}
        </Badge>
      </div>

      {/* Main OT Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Vehículo</p>
              <p className="font-semibold">{mockMainOT.vehicleCode}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-semibold capitalize">{mockMainOT.type === 'preventive' ? 'Preventivo' : mockMainOT.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prioridad</p>
              <p className="font-semibold capitalize">{mockMainOT.priority}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creada</p>
              <p className="font-semibold">{mockMainOT.createdDate}</p>
            </div>
          </div>
          <p className="text-sm">{mockMainOT.description}</p>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Progreso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Progreso General: {mockMainOT.progress}%</span>
              <span className="text-sm text-muted-foreground">{mockMainOT.subOTs.length} sub-órdenes</span>
            </div>
            <Progress value={mockMainOT.progress} className="h-3" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Horas</p>
              <p className="text-lg font-bold">{mockMainOT.completedHours}h / {mockMainOT.totalHours}h</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costo</p>
              <p className="text-lg font-bold">${mockMainOT.spentCost.toLocaleString()} / ${mockMainOT.estimatedCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sub-órdenes</p>
              <p className="text-lg font-bold">{mockMainOT.subOTs.filter(s => s.status === 'completed').length} / {mockMainOT.subOTs.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-OTs Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle>Sub-Órdenes por Componente</CardTitle>
          <CardDescription>Cada componente tiene su propia sub-orden con técnico asignado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockMainOT.subOTs.map(subOT => (
            <SubOTCard
              key={subOT.id}
              subOT={subOT}
              expanded={expandedSubOTs.includes(subOT.id)}
              onToggle={() => toggleSubOT(subOT.id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline">Editar</Button>
        <Button variant="outline">Generar Reporte</Button>
        <Button variant="outline">Cerrar Orden</Button>
        <Button className="ml-auto" variant="outline">Volver</Button>
      </div>
    </div>
  );
}
