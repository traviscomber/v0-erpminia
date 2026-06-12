'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

export function SustainabilityWorkflowDiagram() {
  const phases = [
    {
      icon: <FileText className="h-6 w-6 text-foreground" />,
      title: 'FASE 1: Planificación',
      description: 'Calendario de inspecciones, normativas y riesgos identificados',
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-foreground" />,
      title: 'FASE 2: Ejecución',
      description: 'Inspecciones, capacitaciones, EPP y monitoreo ambiental',
    },
    {
      icon: <AlertCircle className="h-6 w-6 text-foreground" />,
      title: 'FASE 3: Análisis',
      description: 'Revisión de hallazgos, cálculo de cumplimiento e identificación de brechas',
    },
    {
      icon: <Clock className="h-6 w-6 text-foreground" />,
      title: 'FASE 4: Cierre',
      description: 'Acciones correctivas, verificación con evidencia y archivo documental',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          Ciclo de Sostenibilidad Integrado
        </CardTitle>
        <CardDescription>Flujo de trabajo desde planificación hasta cierre documentado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {phases.map((phase, idx) => (
            <div key={phase.title}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {phase.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{phase.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{phase.description}</p>
                </div>
              </div>
              {idx < phases.length - 1 && (
                <div className="mt-4 flex justify-center">
                  <ArrowRight className="h-5 w-5 rotate-90 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
