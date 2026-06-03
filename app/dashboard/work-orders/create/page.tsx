'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const mockVehicles = [
  { id: '1', code: 'EXC-001', name: 'Excavadora CAT 390F', model: 'CAT 390F', year: 2019 }
];

const mockComponents = [
  { id: 'motor', name: 'Sistema Motor y Transmision', code: 'EXC-MOTOR', estimatedHours: 4 },
  { id: 'hidraulico', name: 'Sistema Hidraulico', code: 'EXC-HIDRAULICO', estimatedHours: 3 },
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
  const [submitting, setSubmitting] = useState(false);

  const selectedVehicleData = mockVehicles.find((v) => v.id === selectedVehicle);
  const selectedComponentsData = mockComponents.filter((c) => selectedComponents.includes(c.id));
  const totalHours = selectedComponentsData.reduce((sum, c) => sum + c.estimatedHours, 0);

  const handleComponentToggle = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId) ? prev.filter((id) => id !== componentId) : [...prev, componentId]
    );
  };

  const handleCreateOT = async () => {
    if (!selectedVehicle || selectedComponents.length === 0) {
      toast.error('Selecciona vehiculo y al menos un componente');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${selectedVehicleData?.name || 'Vehiculo'} - ${selectedComponentsData.map((c) => c.name).join(', ')}`,
          description:
            description ||
            `Mantenimiento ${orderType} para ${selectedVehicleData?.name}. Componentes: ${selectedComponentsData.map((c) => c.name).join(', ')}`,
          workType: orderType,
          priority,
          plannedDurationHours: totalHours,
          scheduledDate: new Date().toISOString().split('T')[0],
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No fue posible crear la orden');

      toast.success('Orden de trabajo creada');
      router.push(`/dashboard/work-orders/${result.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la orden');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crear Orden de Mantencion</h1>
        <p className="text-muted-foreground mt-2">Flujo base del MVP para ordenes de trabajo</p>
      </div>

      <div className="flex gap-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`flex items-center gap-2 pb-2 ${step >= n ? 'border-b-2 border-primary' : 'border-b-2 border-muted'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{n}</div>
            <span className="text-sm font-medium">{n === 1 ? 'Vehiculo' : n === 2 ? 'Componentes' : 'Detalles'}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Vehiculo</CardTitle>
            <CardDescription>Elige el equipo para esta orden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockVehicles.map((vehicle) => (
              <div key={vehicle.id} onClick={() => setSelectedVehicle(vehicle.id)} className={`p-4 border-2 rounded-lg cursor-pointer transition ${selectedVehicle === vehicle.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{vehicle.name}</h3>
                    <p className="text-sm text-muted-foreground">Codigo: {vehicle.code}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.model} - {vehicle.year}</p>
                  </div>
                  {selectedVehicle === vehicle.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Componentes</CardTitle>
            <CardDescription>Define el alcance del trabajo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockComponents.map((component) => (
              <label key={component.id} className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition">
                <Checkbox checked={selectedComponents.includes(component.id)} onCheckedChange={() => handleComponentToggle(component.id)} className="mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold">{component.name}</h4>
                  <p className="text-sm text-muted-foreground">{component.code}</p>
                  <p className="text-sm text-muted-foreground">Tiempo estimado: {component.estimatedHours}h</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Mantenimiento</label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripcion</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas adicionales del trabajo..." className="w-full p-2 border rounded-lg min-h-24" />
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Resumen</p>
              <p>Vehiculo: {selectedVehicleData?.name}</p>
              <p>Componentes: {selectedComponents.length}</p>
              <p>Tiempo total: {totalHours}h</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2"><ChevronLeft className="w-4 h-4" /> Anterior</Button>}
        {step < 3 && <Button onClick={() => setStep(step + 1)} disabled={(step === 1 && !selectedVehicle) || (step === 2 && selectedComponents.length === 0)} className="gap-2 ml-auto">Siguiente <ArrowRight className="w-4 h-4" /></Button>}
        {step === 3 && <Button onClick={handleCreateOT} disabled={submitting} className="ml-auto gap-2 bg-[var(--brand-verde)] hover:bg-[var(--brand-verde)]/90"><CheckCircle2 className="w-4 h-4" /> {submitting ? 'Creando...' : 'Crear Orden'}</Button>}
      </div>
    </div>
  );
}
