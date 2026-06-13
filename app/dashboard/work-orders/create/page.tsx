'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type MaintenanceAsset = {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  status: string;
  location: string;
  manufacturer: string;
  model: string;
  criticality: string;
};

type ComponentTemplate = {
  id: string;
  name: string;
  code: string;
  estimatedHours: number;
};

const COMPONENT_TEMPLATES: Record<string, ComponentTemplate[]> = {
  excavator: [
    { id: 'motor', name: 'Sistema Motor y Transmision', code: 'EXC-MOTOR', estimatedHours: 4 },
    { id: 'hydraulics', name: 'Sistema Hidraulico', code: 'EXC-HIDRAULICO', estimatedHours: 3 },
    { id: 'undercarriage', name: 'Tren de Rodaje', code: 'EXC-RODAJE', estimatedHours: 6 },
    { id: 'cooling', name: 'Sistema de Enfriamiento', code: 'EXC-ENFRIAMIENTO', estimatedHours: 2 },
  ],
  pump: [
    { id: 'impeller', name: 'Impulsor y carcasa', code: 'PMP-IMP', estimatedHours: 3 },
    { id: 'seal', name: 'Sellos mecanicos', code: 'PMP-SEAL', estimatedHours: 2 },
    { id: 'bearings', name: 'Rodamientos', code: 'PMP-BEAR', estimatedHours: 2 },
    { id: 'lubrication', name: 'Sistema de lubricacion', code: 'PMP-LUBE', estimatedHours: 1 },
  ],
  motor: [
    { id: 'stator', name: 'Estator y bobinado', code: 'MTR-STAT', estimatedHours: 5 },
    { id: 'bearings', name: 'Rodamientos y soporte', code: 'MTR-BEAR', estimatedHours: 2 },
    { id: 'alignment', name: 'Alineacion y acople', code: 'MTR-ALIGN', estimatedHours: 2 },
    { id: 'cooling', name: 'Ventilacion y enfriamiento', code: 'MTR-COOL', estimatedHours: 1 },
  ],
  conveyor: [
    { id: 'belt', name: 'Correa transportadora', code: 'CNV-BELT', estimatedHours: 4 },
    { id: 'rollers', name: 'Polines y estaciones', code: 'CNV-ROLL', estimatedHours: 3 },
    { id: 'drive', name: 'Unidad motriz', code: 'CNV-DRIVE', estimatedHours: 3 },
    { id: 'structure', name: 'Estructura y guardas', code: 'CNV-STRU', estimatedHours: 2 },
  ],
  mill: [
    { id: 'liner', name: 'Revestimientos', code: 'MIL-LINER', estimatedHours: 8 },
    { id: 'gear', name: 'Corona y pinon', code: 'MIL-GEAR', estimatedHours: 6 },
    { id: 'lubrication', name: 'Lubricacion', code: 'MIL-LUBE', estimatedHours: 2 },
    { id: 'drive', name: 'Sistema de accionamiento', code: 'MIL-DRIVE', estimatedHours: 4 },
  ],
  generic: [
    { id: 'inspection', name: 'Inspeccion general', code: 'GEN-INSP', estimatedHours: 2 },
    { id: 'power', name: 'Sistema de potencia', code: 'GEN-POWER', estimatedHours: 3 },
    { id: 'fluids', name: 'Fluidos y sellos', code: 'GEN-FLUID', estimatedHours: 2 },
    { id: 'structure', name: 'Estructura y fijaciones', code: 'GEN-STRUC', estimatedHours: 2 },
  ],
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
};

function resolveAssetTemplate(asset: MaintenanceAsset | null) {
  if (!asset) {
    return COMPONENT_TEMPLATES.generic;
  }

  const haystack = `${asset.asset_type || ''} ${asset.asset_name || ''}`.toLowerCase();

  if (haystack.includes('excav')) return COMPONENT_TEMPLATES.excavator;
  if (haystack.includes('pump') || haystack.includes('bomba')) return COMPONENT_TEMPLATES.pump;
  if (haystack.includes('motor')) return COMPONENT_TEMPLATES.motor;
  if (haystack.includes('conveyor') || haystack.includes('correa')) return COMPONENT_TEMPLATES.conveyor;
  if (haystack.includes('mill') || haystack.includes('molino') || haystack.includes('sag'))
    return COMPONENT_TEMPLATES.mill;

  return COMPONENT_TEMPLATES.generic;
}

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [orderType, setOrderType] = useState('preventive');
  const [priority, setPriority] = useState('high');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, error, isLoading } = useSWR('/api/maintenance/assets', fetcher, {
    revalidateOnFocus: false,
  });

  const assets = (data.assets || []) as MaintenanceAsset[];
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const availableComponents = useMemo(
    () => resolveAssetTemplate(selectedAsset ?? null),
    [selectedAsset]
  );
  const selectedComponentsData = availableComponents.filter((component) =>
    selectedComponents.includes(component.id)
  );
  const totalHours = selectedComponentsData.reduce((sum, component) => sum + component.estimatedHours, 0);

  const handleComponentToggle = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId) ? prev.filter((id) => id !== componentId) : [...prev, componentId]
    );
  };

  const handleAssetChange = (assetId: string) => {
    setSelectedAssetId(assetId);
    setSelectedComponents([]);
  };

  const handleCreateOT = async () => {
    if (!selectedAsset || selectedComponents.length === 0) {
      toast.error('Selecciona un activo y al menos un componente');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          title: `${selectedAsset.asset_name} - ${selectedComponentsData.map((component) => component.name).join(', ')}`,
          description:
            description ||
            `Mantenimiento ${orderType} para ${selectedAsset.asset_name}. Componentes: ${selectedComponentsData.map((component) => component.name).join(', ')}`,
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
        <p className="text-muted-foreground mt-2">
          Flujo base del MVP con activos reales de mantencion
        </p>
      </div>

      <div className="flex gap-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex items-center gap-2 pb-2 ${
              step >= n ? 'border-b-2 border-primary' : 'border-b-2 border-muted'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= n ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {n}
            </div>
            <span className="text-sm font-medium">
              {n === 1 ? 'Activo' : n === 2 ? 'Componentes' : 'Detalles'}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Activo</CardTitle>
            <CardDescription>Elige el equipo real para esta orden de trabajo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="text-sm text-muted-foreground">Cargando activos...</div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>No fue posible cargar los activos de mantencion.</span>
                </div>
              </div>
            )}

            {!isLoading && !error && assets.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                No hay activos registrados en `maintenance_assets` todavia.
              </div>
            )}

            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => handleAssetChange(asset.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  selectedAssetId === asset.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold">{asset.asset_name}</h3>
                    <p className="text-sm text-muted-foreground">Codigo: {asset.asset_code}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.asset_type || 'Sin tipo'} - {asset.location || 'Sin ubicacion'}
                    </p>
                    {(asset.manufacturer || asset.model) && (
                      <p className="text-sm text-muted-foreground">
                        {[asset.manufacturer, asset.model].filter(Boolean).join(' - ')}
                      </p>
                    )}
                  </div>
                  {selectedAssetId === asset.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
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
            <CardDescription>
              Define el alcance del trabajo para {selectedAsset?.asset_name || 'el activo'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableComponents.map((component) => (
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
                  <p className="text-sm text-muted-foreground">
                    Tiempo estimado: {component.estimatedHours}h
                  </p>
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
                  <SelectItem value="critical">Critica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripcion</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Notas adicionales del trabajo..."
                className="w-full p-2 border rounded-lg min-h-24"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Resumen</p>
              <p>Activo: {selectedAsset?.asset_name || '-'}</p>
              <p>Codigo: {selectedAsset?.asset_code || '-'}</p>
              <p>Componentes: {selectedComponents.length}</p>
              <p>Tiempo total: {totalHours}h</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
        )}
        {step < 3 && (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && !selectedAssetId) ||
              (step === 2 && selectedComponents.length === 0)
            }
            className="gap-2 ml-auto"
          >
            Siguiente <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {step === 3 && (
          <Button
            onClick={handleCreateOT}
            disabled={submitting}
            className="ml-auto gap-2 bg-[var(--brand-verde)] hover:bg-[var(--brand-verde)]/90"
          >
            <CheckCircle2 className="w-4 h-4" /> {submitting ? 'Creando...' : 'Crear Orden'}
          </Button>
        )}
      </div>
    </div>
  );
}

