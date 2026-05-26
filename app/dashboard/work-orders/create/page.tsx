'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';

// Mock data - en producción vendría de la BD
const mockVehicles = [
  { id: '1', code: 'EXC-001', name: 'Excavadora CAT 390F', model: 'CAT 390F', year: 2019 }
];

const mockComponents = [
  { id: 'motor', name: 'Sistema Motor y Transmisión', code: 'EXC-MOTOR', estimatedHours: 4 },
  { id: 'hidraulico', name: 'Sistema Hidráulico', code: 'EXC-HIDRAULICO', estimatedHours: 3 },
  { id: 'rodaje', name: 'Tren de Rodaje', code: 'EXC-RODAJE', estimatedHours: 6 },
  { id: 'enfriamiento', name: 'Sistema de Enfriamiento', code: 'EXC-ENFRIAMIENTO', estimatedHours: 2 }
];

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [orderType, setOrderType] = useState('preventive');
  const [priority, setPriority] = useState('high');
  const [description, setDescription] = useState('');

  const selectedVehicleData = mockVehicles.find(v => v.id === selectedVehicle);
  const selectedComponentsData = mockComponents.filter(c => selectedComponents.includes(c.id));
  const totalHours = selectedComponentsData.reduce((sum, c) => sum + c.estimatedHours, 0);

  const handleComponentToggle = (componentId: string) => {
    setSelectedComponents(prev =>
      prev.includes(componentId)
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleCreateOT = async () => {
    if (!selectedVehicle || selectedComponents.length === 0) {
      alert('Selecciona vehículo y al menos un componente');
      return;
    }

    // Aquí se crearía la OT principal + sub-OTs en la BD
    console.log({
      vehicle: selectedVehicleData,
      components: selectedComponentsData,
      type: orderType,
      priority,
      description,
      totalHours
    });

    // Simular creación exitosa
    router.push('/dashboard/work-orders');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crear Orden de Mantención</h1>
        <p className="text-muted-foreground mt-2">Sistema jerárquico para mantención por componentes</p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-4">
        <div className={`flex items-center gap-2 pb-2 ${step >= 1 ? 'border-b-2 border-primary' : 'border-b-2 border-muted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>1</div>
          <span className="text-sm font-medium">Vehículo</span>
        </div>
        <div className={`flex items-center gap-2 pb-2 ${step >= 2 ? 'border-b-2 border-primary' : 'border-b-2 border-muted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>2</div>
          <span className="text-sm font-medium">Componentes</span>
        </div>
        <div className={`flex items-center gap-2 pb-2 ${step >= 3 ? 'border-b-2 border-primary' : 'border-b-2 border-muted'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>3</div>
          <span className="text-sm font-medium">Detalles</span>
        </div>
      </div>

      {/* Step 1: Select Vehicle */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Vehículo</CardTitle>
            <CardDescription>Elige el vehículo para esta orden de mantenimiento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockVehicles.map(vehicle => (
              <div
                key={vehicle.id}
                onClick={() => setSelectedVehicle(vehicle.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedVehicle === vehicle.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{vehicle.name}</h3>
                    <p className="text-sm text-muted-foreground">Código: {vehicle.code}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.model} • {vehicle.year}</p>
                  </div>
                  {selectedVehicle === vehicle.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Components */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Componentes</CardTitle>
            <CardDescription>
              Se creará una sub-OT para cada componente. Múltiples técnicos pueden trabajar en paralelo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockComponents.map(component => (
              <label
                key={component.id}
                className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition"
              >
                <Checkbox
                  checked={selectedComponents.includes(component.id)}
                  onCheckedChange={() => handleComponentToggle(component.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{component.name}</h4>
                  <p className="text-sm text-muted-foreground">{component.code}</p>
                  <p className="text-sm text-muted-foreground">Tiempo estimado: {component.estimatedHours}h</p>
                </div>
              </label>
            ))}

            {selectedComponents.length > 0 && (
              <div className="mt-4 p-3 bg-[var(--secondary)]/5 border border-[var(--secondary)]/30 rounded-lg">
                <p className="text-sm font-semibold">Total estimado: {totalHours} horas</p>
                <p className="text-sm text-muted-foreground">Se crearán {selectedComponents.length} sub-órdenes</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Orden</CardTitle>
            <CardDescription>Tipo, prioridad y descripción de la orden principal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Mantenimiento</label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventivo</SelectItem>
                  <SelectItem value="corrective">Correctivo</SelectItem>
                  <SelectItem value="predictive">Predictivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción / Notas</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Notas adicionales sobre el mantenimiento..."
                className="w-full p-2 border rounded-lg min-h-24"
              />
            </div>

            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-semibold">Resumen de la Orden:</p>
              <p className="text-sm">Vehículo: {selectedVehicleData?.name}</p>
              <p className="text-sm">Componentes: {selectedComponents.length}</p>
              <p className="text-sm">Tiempo total: {totalHours}h</p>
              <p className="text-sm">Tipo: {orderType === 'preventive' ? 'Preventivo' : orderType === 'corrective' ? 'Correctivo' : 'Predictivo'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
        )}
        {step < 3 && (
          <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedVehicle || step === 2 && selectedComponents.length === 0} className="gap-2 ml-auto">
            Siguiente <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {step === 3 && (
          <Button onClick={handleCreateOT} className="ml-auto gap-2 bg-[var(--brand-verde)] hover:bg-[var(--brand-verde)]/90">
            <CheckCircle2 className="w-4 h-4" /> Crear Orden Jerárquica
          </Button>
        )}
      </div>
    </div>
  );
}
