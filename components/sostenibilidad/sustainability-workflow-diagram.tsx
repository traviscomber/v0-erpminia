'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';

export function SustainabilityWorkflowDiagram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full"></div>
          Ciclo de Sostenibilidad Integrado
        </CardTitle>
        <CardDescription>
          Flujo automático desde inspecciones hasta cierre documentado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Phase 1: Planificación */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-semibold text-foreground">
                FASE 1: Planificación
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Calendario de inspecciones, normativas y riesgos identificados
              </p>
            </div>
            <Badge variant="secondary">Inicio</Badge>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Phase 2: Ejecución */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-100">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-semibold text-foreground">
                FASE 2: Ejecución
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Inspecciones, capacitaciones, EPP, monitoreo ambiental
              </p>
            </div>
            <Badge variant="secondary">En Curso</Badge>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Phase 3: Análisis */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-100">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-semibold text-foreground">
                FASE 3: Análisis
              </h3>
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p>• Auto-generación de No-Conformidades desde hallazgos</p>
                <p>• Cálculo de Compliance Score en tiempo real</p>
                <p>• Alertas automáticas de incumplimiento</p>
              </div>
            </div>
            <Badge variant="secondary">Auto</Badge>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Phase 4: Cierre */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-semibold text-foreground">
                FASE 4: Cierre
              </h3>
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p>• Auto-generación de Acciones Correctivas</p>
                <p>• Verificación y cierre con evidencia</p>
                <p>• Archivo automático de documentación</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white">Fin</Badge>
          </div>

          {/* Automations Overview */}
          <div className="mt-8 p-4 bg-secondary/5 border border-secondary/20 rounded-lg">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Automaciones Implementadas
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <span>NC Auto-Create from Inspecciones</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <span>CA Auto-Create from NCs</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <span>Compliance Score Calculation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <span>Overdue Alerts Detection</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <span>Calendar Event Sync</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                <span>Event Log Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
