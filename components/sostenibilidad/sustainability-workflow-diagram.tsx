'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';

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
      description: 'Inspecciones, capacitaciones, EPP, monitoreo ambiental',
    },
    {
      icon: <AlertCircle className="h-6 w-6 text-foreground" />,
      title: 'FASE 3: Análisis',
      description: 'Revisión de hallazgos, cálculo de cumplimiento, identificación de brechas',
    },
    {
      icon: <Clock className="h-6 w-6 text-foreground" />,
      title: 'FASE 4: Cierre',
      description: 'Acciones correctivas, verificación con evidencia, archivo de documentación',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full" />
          Ciclo de Sostenibilidad Integrado
        </CardTitle>
        <CardDescription>
          Flujo de trabajo desde planificación hasta cierre documentado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {phases.map((phase, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                    {phase.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{phase.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{phase.description}</p>
                </div>
              </div>
              {idx < phases.length - 1 && (
                <div className="flex justify-center mt-4">
                  <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
