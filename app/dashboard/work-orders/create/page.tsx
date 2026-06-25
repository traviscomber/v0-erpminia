'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { inferMachineFamilyFromText } from '@/lib/maintenance/cost-center-machines';

type MaintenanceAsset = {
  id: string;
  asset_code?: string;
  assetCode?: string;
  asset_name?: string;
  assetName?: string;
  asset_type?: string;
  assetType?: string;
  status: string;
  location?: string;
  manufacturer?: string;
  model?: string;
  criticality?: string;
};

type ComponentTemplate = {
  id: string;
  name: string;
  code: string;
  estimatedHours: number;
};

type AssetCard = MaintenanceAsset & { family: string };

const COMPONENT_TEMPLATES: Record<string, ComponentTemplate[]> = {
  excavator: [
    { id: 'motor', name: 'Sistema motor y transmision', code: 'EXC-MOTOR', estimatedHours: 4 },
    { id: 'hydraulics', name: 'Sistema hidraulico', code: 'EXC-HIDRAULICO', estimatedHours: 3 },
    { id: 'undercarriage', name: 'Tren de rodaje', code: 'EXC-RODAJE', estimatedHours: 6 },
    { id: 'cooling', name: 'Sistema de enfriamiento', code: 'EXC-ENFRIAMIENTO', estimatedHours: 2 },
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
  if (!response.ok) return null;
  return payload;
};

function resolveAssetTemplate(asset: MaintenanceAsset | null) {
  if (!asset) return COMPONENT_TEMPLATES.generic;

  const haystack = `${asset.asset_type || asset.assetType || ''} ${asset.asset_name || asset.assetName || ''}`.toLowerCase();

  if (haystack.includes('excav')) return COMPONENT_TEMPLATES.excavator;
  if (haystack.includes('pump') || haystack.includes('bomba')) return COMPONENT_TEMPLATES.pump;
  if (haystack.includes('motor')) return COMPONENT_TEMPLATES.motor;
  if (haystack.includes('conveyor') || haystack.includes('correa')) return COMPONENT_TEMPLATES.conveyor;
  if (haystack.includes('mill') || haystack.includes('molino') || haystack.includes('sag')) return COMPONENT_TEMPLATES.mill;

  return COMPONENT_TEMPLATES.generic;
}

function normalizeAsset(asset: MaintenanceAsset) {
  return {
    ...asset,
    asset_code: asset.asset_code || asset.assetCode || '',
    asset_name: asset.asset_name || asset.assetName || '',
    asset_type: asset.asset_type || asset.assetType || '',
  };
}

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('assetId') || '';
  // Pre-fill from maquinaria page: ?cost_center=10-3&machine=Scoop+Atlas+Copco
  const prefilledCostCenter = searchParams.get('cost_center') || '';
  const prefilledMachine = searchParams.get('machine') || '';

  const [step, setStep] = useState(1);
  const [selectedAssetId, setSelectedAssetId] = useState(initialAssetId);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [orderType, setOrderType] = useState('preventive');
  const [priority, setPriority] = useState('high');
  const [description, setDescription] = useState(
    prefilledMachine ? `Mantenimiento de ${prefilledMachine}${prefilledCostCenter ? ` (CC: ${prefilledCostCenter})` : ''}` : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [familyFilter, setFamilyFilter] = useState('all');

  const { data, error, isLoading } = useSWR('/api/maintenance/assets', fetcher, {
    revalidateOnFocus: false,
  });
  const { data: machineCatalogData } = useSWR('/api/maintenance/cost-center-machines', fetcher, {
    revalidateOnFocus: false,
  });

  const assets = useMemo(() => ((data?.assets || []) as MaintenanceAsset[]).map(normalizeAsset), [data]);
  const assetCards = useMemo<AssetCard[]>(() => {
    return assets
      .map((asset) => {
        const family = inferMachineFamilyFromText(`${asset.asset_name || ''} ${asset.asset_type || ''} ${asset.model || ''} ${asset.manufacturer || ''}`) || 'Sin familia';
        return { ...asset, family };
      })
      .sort((a, b) => {
        const familyCompare = String(a.family || '').localeCompare(String(b.family || ''), 'es', { sensitivity: 'base' });
        if (familyCompare !== 0) return familyCompare;
        return String(a.asset_name || '').localeCompare(String(b.asset_name || ''), 'es', { sensitivity: 'base' });
      });
  }, [assets]);
  const machineFamilies = useMemo(() => {
    const derivedFamilies = new Set<string>();
    const catalogItems = Array.isArray(machineCatalogData?.machines) ? machineCatalogData.machines : [];
    catalogItems.forEach((item: any) => {
      if (item?.family) derivedFamilies.add(String(item.family));
    });
    assetCards.forEach((asset) => {
      if (asset.family && asset.family !== 'Sin familia') derivedFamilies.add(String(asset.family));
    });
    return ['all', ...Array.from(derivedFamilies).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))];
  }, [assetCards, machineCatalogData?.machines]);
  const selectedAsset = assetCards.find((asset) => asset.id === selectedAssetId) ?? null;
  const availableComponents = useMemo(() => resolveAssetTemplate(selectedAsset), [selectedAsset]);
  const selectedComponentsData = useMemo(
    () => availableComponents.filter((component) => selectedComponents.includes(component.id)),
    [availableComponents, selectedComponents],
  );
  const totalHours = selectedComponentsData.reduce((sum, component) => sum + component.estimatedHours, 0);
  const visibleAssets = useMemo(
    () => assetCards.filter((asset) => familyFilter === 'all' || String(asset.family || '') === familyFilter),
    [assetCards, familyFilter],
  );

  useEffect(() => {
    if (!selectedAssetId && initialAssetId && assets.some((asset) => asset.id === initialAssetId)) {
      setSelectedAssetId(initialAssetId);
    }
  }, [assets, initialAssetId, selectedAssetId]);

  const handleComponentToggle = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId) ? prev.filter((id) => id !== componentId) : [...prev, componentId],
    );
  };

  const handleCreateOT = async () => {
    if (!selectedAsset || selectedComponents.length === 0) {
      toast.error('Selecciona un activo y al menos un componente');
      return;
    }

    setSubmitting(true);
    try {
      const assetName = selectedAsset.asset_name || 'Activo';
      const componentNames = selectedComponentsData.map((component) => component.name).join(', ');

      const response = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          title: `${assetName} - ${componentNames}`,
          description: description || `Mantenimiento ${orderType} para ${assetName}. Componentes: ${componentNames}`,
          workType: orderType,
          priority,
          plannedDurationHours: totalHours,
          scheduledDate: new Date().toISOString().split('T')[0],
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'No fue posible crear la orden');

      const createdId = result?.data?.id;
      toast.success('Orden de trabajo creada');
      if (createdId) {
        router.push(`/dashboard/work-orders/${createdId}`);
      } else {
        router.push('/dashboard/work-orders');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la orden');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crear orden de mantenimiento</h1>
        <p className="mt-2 text-muted-foreground">Flujo base del MVP con activos reales de mantenimiento.</p>
      </div>

      {prefilledMachine && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Creando OT para <span className="font-semibold">{prefilledMachine}</span>
            {prefilledCostCenter && <span className="text-muted-foreground"> — Centro de costo {prefilledCostCenter}</span>}
          </span>
        </div>
      )}

      <div className="flex gap-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex items-center gap-2 pb-2 ${step >= n ? 'border-b-2 border-primary' : 'border-b-2 border-muted'}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step >= n ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {n}
            </div>
            <span className="text-sm font-medium">{n === 1 ? 'Activo' : n === 2 ? 'Componentes' : 'Detalles'}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar activo</CardTitle>
            <CardDescription>Elige el equipo real para esta orden de trabajo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {machineFamilies.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {machineFamilies.map((family) => (
                  <Button
                    key={family}
                    type="button"
                    variant={familyFilter === family ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFamilyFilter(family)}
                  >
                    {family === 'all' ? 'Todas las familias' : family}
                  </Button>
                ))}
              </div>
            ) : null}

            {isLoading && <div className="text-sm text-muted-foreground">Cargando activos...</div>}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>No fue posible cargar los activos de mantenimiento.</span>
                </div>
              </div>
            )}

            {!isLoading && !error && visibleAssets.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                No hay activos registrados para esta familia.
              </div>
            )}

            {visibleAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => {
                  setSelectedAssetId(asset.id);
                  setSelectedComponents([]);
                }}
                className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                  selectedAssetId === asset.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{asset.asset_name || 'Activo sin nombre'}</h3>
                    <p className="text-sm text-muted-foreground">Codigo: {asset.asset_code || '-'}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.asset_type || 'Sin tipo'} - {asset.location || 'Sin ubicacion'}
                    </p>
                    {(asset.manufacturer || asset.model) && (
                      <p className="text-sm text-muted-foreground">
                        {[asset.manufacturer, asset.model].filter(Boolean).join(' - ')}
                      </p>
                    )}
                    <div className="mt-2">
                      <Badge variant="outline">{asset.family || 'Sin familia'}</Badge>
                    </div>
                  </div>
                  {selectedAssetId === asset.id && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar componentes</CardTitle>
            <CardDescription>Define el alcance del trabajo para {selectedAsset?.asset_name || 'el activo'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableComponents.map((component) => (
              <label
                key={component.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:bg-accent/50"
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
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de mantenimiento</label>
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
                className="min-h-24 w-full rounded-lg border p-2"
              />
            </div>

            <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
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
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
        )}

        {step < 3 && (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={(step === 1 && !selectedAssetId) || (step === 2 && selectedComponents.length === 0)}
            className="ml-auto gap-2"
          >
            Siguiente <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {step === 3 && (
          <Button
            onClick={handleCreateOT}
            disabled={submitting}
            className="ml-auto gap-2 bg-[var(--brand-verde)] hover:bg-[var(--brand-verde)]/90"
          >
            <CheckCircle2 className="h-4 w-4" /> {submitting ? 'Creando...' : 'Crear orden'}
          </Button>
        )}
      </div>
    </div>
  );
}
