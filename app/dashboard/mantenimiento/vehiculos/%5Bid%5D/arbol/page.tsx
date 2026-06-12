'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';

// Example fault tree data for CAT 390F Excavator
const faultTreeData = {
  name: 'Excavadora CAT 390F',
  code: 'EXC-001',
  components: [
    {
      id: '1',
      name: 'Sistema Motor',
      code: 'MOTOR-001',
      status: 'operativo',
      faults: [
        {
          id: 'f1',
          name: 'Sobrecalentamiento',
          code: 'FM-MOTOR-001',
          severity: 'critica',
          symptoms: 'Temperatura > 95°C, humo',
          parts: [
            { id: 'p1', name: 'Radiador', code: 'PART-RAD-001', cost: 4500, stock: 0 },
            { id: 'p2', name: 'Termostato', code: 'PART-TERM-001', cost: 450, stock: 2 },
            { id: 'p3', name: 'Ventilador', code: 'PART-VEN-001', cost: 2800, stock: 1 },
          ],
        },
        {
          id: 'f2',
          name: 'Pérdida de potencia',
          code: 'FM-MOTOR-002',
          severity: 'mayor',
          symptoms: 'Baja presión, humo negro',
          parts: [
            { id: 'p4', name: 'Juego Inyectores', code: 'PART-INY-001', cost: 1800, stock: 0 },
            { id: 'p5', name: 'Turbocompresor', code: 'PART-TURBO-001', cost: 8900, stock: 0 },
          ],
        },
      ],
    },
    {
      id: '2',
      name: 'Sistema Hidráulico',
      code: 'HIDRO-001',
      status: 'operativo',
      faults: [
        {
          id: 'f3',
          name: 'Baja presión hidráulica',
          code: 'FM-HID-001',
          severity: 'critica',
          symptoms: 'Movimientos lentos, sin fuerza',
          parts: [
            { id: 'p6', name: 'Bomba Hidráulica', code: 'PART-BOMBA-001', cost: 12500, stock: 0 },
            { id: 'p7', name: 'Filtro Hidráulico', code: 'PART-FILTRO-001', cost: 180, stock: 5 },
          ],
        },
      ],
    },
    {
      id: '3',
      name: 'Tren de Rodaje',
      code: 'RODAJE-001',
      status: 'operativo',
      faults: [
        {
          id: 'f4',
          name: 'Desgaste de orugas',
          code: 'FM-RODAJE-001',
          severity: 'mayor',
          symptoms: 'Ruido excesivo, resbalamiento',
          parts: [
            { id: 'p8', name: 'Orugas (par)', code: 'PART-ORUGAS-001', cost: 18000, stock: 0 },
          ],
        },
      ],
    },
  ],
};

interface ComponentNode {
  id: string;
  name: string;
  code: string;
  status: string;
  faults: any[];
}

function FaultItem({ fault, onSelectPart }: any) {
  const severityColor = {
    critica: 'bg-destructive/10 text-destructive border-destructive/20',
    mayor: 'bg-orange-100/50 text-orange-800 border-orange-200',
    menor: 'bg-[var(--secondary)]/10/50 text-[var(--secondary)] border-[var(--secondary)]/30',
  };

  const SeverityIcon = fault.severity === 'critica' ? AlertCircle : AlertTriangle;

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <SeverityIcon className={`h-5 w-5 mt-0.5 ${fault.severity === 'critica' ? 'text-destructive' : 'text-orange-600'}`} />
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
        <p className="text-muted-foreground"><span className="font-medium">Síntomas:</span> {fault.symptoms}</p>
      </div>

      {/* Parts for this fault */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Piezas Asociadas:</p>
        <div className="space-y-2">
          {fault.parts.map((part: any) => (
            <div key={part.id} className="flex items-center justify-between p-2 rounded bg-background border border-border text-sm">
              <div>
                <p className="font-medium">{part.name}</p>
                <p className="text-xs text-muted-foreground">{part.code}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-semibold">${part.cost.toLocaleString()}</p>
                  <p className={`text-xs ${part.stock === 0 ? 'text-destructive' : 'text-accent'}`}>
                    Stock: {part.stock}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onSelectPart(part)}
                >
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

function ComponentNode({ component, onSelectPart }: { component: ComponentNode; onSelectPart: any }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 w-full text-left transition-colors"
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
    if (!selectedParts.find(p => p.id === part.id)) {
      setSelectedParts([...selectedParts, part]);
    }
  };

  const handleRemovePart = (partId: string) => {
    setSelectedParts(selectedParts.filter(p => p.id !== partId));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Fault Tree */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{faultTreeData.name}</h1>
          <p className="text-muted-foreground mt-2">Árbol de fallas interactivo - Selecciona piezas para agregar a orden</p>
        </div>

        {/* Components Tree */}
        <Card>
          <CardHeader>
            <CardTitle>Árbol de Componentes</CardTitle>
            <CardDescription>Haz clic en un componente para ver sus modos de falla</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {faultTreeData.components.map((component: any) => (
              <ComponentNode key={component.id} component={component} onSelectPart={handleSelectPart} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Parts Selector Sidebar */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg">Piezas Seleccionadas</CardTitle>
            <CardDescription>{selectedParts.length} piezas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedParts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Selecciona piezas del árbol para agregar</p>
            ) : (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedParts.map((part: any) => (
                    <div key={part.id} className="p-3 rounded-lg bg-muted border border-border text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{part.name}</p>
                          <p className="text-xs text-muted-foreground">{part.code}</p>
                          <p className="font-semibold text-accent mt-1">${part.cost.toLocaleString()}</p>
                        </div>
                        <Button 
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemovePart(part.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Total estimado:</p>
                    <p className="text-lg font-bold text-accent">
                      ${selectedParts.reduce((sum, p) => sum + p.cost, 0).toLocaleString()}
                    </p>
                  </div>
                  <Button className="w-full gap-2">
                    <Wrench className="h-4 w-4" />
                    Crear Orden de Mantenimiento
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
