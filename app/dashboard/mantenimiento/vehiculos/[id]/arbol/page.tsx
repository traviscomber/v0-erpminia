'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Wrench } from 'lucide-react';

const faultTreeData = {
  name: 'Excavadora CAT 390F',
  code: 'EXC-001',
  components: [
    {
      id: '1',
      name: 'Sistema motor',
      code: 'MOTOR-001',
      status: 'operativo',
      faults: [
        {
          id: 'f1',
          name: 'Sobrecalentamiento',
          code: 'FM-MOTOR-001',
          severity: 'critica',
          symptoms: 'Temperatura > 95C, humo',
          parts: [
            { id: 'p1', name: 'Radiador', code: 'PART-RAD-001', cost: 4500, stock: 0 },
            { id: 'p2', name: 'Termostato', code: 'PART-TERM-001', cost: 450, stock: 2 },
            { id: 'p3', name: 'Ventilador', code: 'PART-VEN-001', cost: 2800, stock: 1 },
          ],
        },
        {
          id: 'f2',
          name: 'Perdida de potencia',
          code: 'FM-MOTOR-002',
          severity: 'mayor',
          symptoms: 'Baja presion, humo negro',
          parts: [
            { id: 'p4', name: 'Juego Inyectores', code: 'PART-INY-001', cost: 1800, stock: 0 },
            { id: 'p5', name: 'Turbocompresor', code: 'PART-TURBO-001', cost: 8900, stock: 0 },
          ],
        },
      ],
    },
    {
      id: '2',
      name: 'Sistema hidraulico',
      code: 'HIDRO-001',
      status: 'operativo',
      faults: [
        {
          id: 'f3',
          name: 'Baja presion hidraulica',
          code: 'FM-HID-001',
          severity: 'critica',
          symptoms: 'Movimientos lentos, sin fuerza',
          parts: [
            { id: 'p6', name: 'Bomba hidraulica', code: 'PART-BOMBA-001', cost: 12500, stock: 0 },
            { id: 'p7', name: 'Filtro hidraulico', code: 'PART-FILTRO-001', cost: 180, stock: 5 },
          ],
        },
      ],
    },
    {
      id: '3',
      name: 'Tren de rodaje',
      code: 'RODAJE-001',
      status: 'operativo',
      faults: [
        {
          id: 'f4',
          name: 'Desgaste de orugas',
          code: 'FM-RODAJE-001',
          severity: 'mayor',
          symptoms: 'Ruido excesivo, resbalamiento',
          parts: [{ id: 'p8', name: 'Orugas (par)', code: 'PART-ORUGAS-001', cost: 18000, stock: 0 }],
        },
      ],
    },
  ],
};

function FaultItem({ fault, onSelectPart }: any) {
  const severityColor = {
    critica: 'bg-destructive/10 text-destructive border-destructive/20',
    mayor: 'bg-orange-100/50 text-orange-800 border-orange-200',
    menor: 'bg-[var(--secondary)]/10/50 text-[var(--secondary)] border-[var(--secondary)]/30',
  };

  const SeverityIcon = fault.severity === 'critica' ? AlertCircle : AlertTriangle;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-1 items-start gap-3">
          <SeverityIcon className={`mt-0.5 h-5 w-5 ${fault.severity === 'critica' ? 'text-destructive' : 'text-orange-600'}`} />
          <div>
            <h4 className="font-semibold">{fault.name}</h4>
            <p className="text-xs text-muted-foreground">{fault.code}</p>
          </div>
        </div>
        <Badge className={severityColor[fault.severity as keyof typeof severityColor]}>
          {fault.severity.toUpperCase()}
        </Badge>
      </div>

      <div className="text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium">Sintomas:</span> {fault.symptoms}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Piezas asociadas:</p>
        <div className="space-y-2">
          {fault.parts.map((part: any) => (
            <div key={part.id} className="flex items-center justify-between rounded border border-border bg-background p-2 text-sm">
              <div>
                <p className="font-medium">{part.name}</p>
                <p className="text-xs text-muted-foreground">{part.code}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-semibold">${part.cost.toLocaleString()}</p>
                  <p className={`text-xs ${part.stock === 0 ? 'text-destructive' : 'text-accent'}`}>Stock: {part.stock}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onSelectPart(part)}>
                  Agregar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComponentNode({ component, onSelectPart }: any) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <div className="flex-1">
          <p className="font-semibold">{component.name}</p>
          <p className="text-xs text-muted-foreground">{component.code}</p>
        </div>
        <Badge className="bg-accent/10 text-accent">{component.faults.length} fallas</Badge>
      </button>

      {expanded && (
        <div className="ml-6 space-y-4 border-l-2 border-border pl-4">
          {component.faults.map((fault: any) => (
            <FaultItem key={fault.id} fault={fault} onSelectPart={onSelectPart} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VehicleFaultTreePage() {
  const [selectedParts, setSelectedParts] = useState<any[]>([]);

  const handleSelectPart = (part: any) => {
    if (!selectedParts.find((p) => p.id === part.id)) {
      setSelectedParts([...selectedParts, part]);
    }
  };

  const handleRemovePart = (partId: string) => {
    setSelectedParts(selectedParts.filter((p) => p.id !== partId));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{faultTreeData.name}</h1>
          <p className="mt-2 text-muted-foreground">
            Arbol de fallas interactivo. Selecciona piezas para agregar a la orden.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Arbol de componentes</CardTitle>
            <CardDescription>Haz clic en un componente para ver sus modos de falla</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {faultTreeData.components.map((component: any) => (
              <ComponentNode key={component.id} component={component} onSelectPart={handleSelectPart} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg">Piezas seleccionadas</CardTitle>
            <CardDescription>{selectedParts.length} piezas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedParts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Selecciona piezas del arbol para agregarlas
              </p>
            ) : (
              <>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {selectedParts.map((part: any) => (
                    <div key={part.id} className="rounded-lg border border-border bg-muted p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{part.name}</p>
                          <p className="text-xs text-muted-foreground">{part.code}</p>
                          <p className="mt-1 font-semibold text-accent">${part.cost.toLocaleString()}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleRemovePart(part.id)}>
                          x
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Total estimado:</p>
                    <p className="text-lg font-bold text-accent">
                      ${selectedParts.reduce((sum, p) => sum + p.cost, 0).toLocaleString()}
                    </p>
                  </div>
                  <Button className="w-full gap-2">
                    <Wrench className="h-4 w-4" />
                    Crear orden de mantenimiento
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
