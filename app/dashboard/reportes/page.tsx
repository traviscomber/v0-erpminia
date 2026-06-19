'use client';

import { ExportReportForm } from '@/components/reportes/export-report-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportesPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Reportes de cumplimiento, trazabilidad y exportacion de datos para auditoria
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reportes disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Mantenimiento, HSE y auditoria</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado de cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground">Todos los registros listos para auditoria</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ultima exportacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Pendiente de generar</p>
          </CardContent>
        </Card>
      </div>

      <ExportReportForm />

      <Card>
        <CardHeader>
          <CardTitle>Descripcion de reportes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Ordenes de trabajo de mantenimiento</p>
            <p className="text-xs text-muted-foreground">
              Registros completos con MTTR, estado, tecnico y repuestos utilizados
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Incidentes e investigaciones HSE</p>
            <p className="text-xs text-muted-foreground">
              Incidentes de seguridad, analisis de causa raiz, acciones correctivas y estado RCA
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Trazabilidad y cumplimiento</p>
            <p className="text-xs text-muted-foreground">
              Registro completo de movimientos, transacciones y contexto de usuario, hora y organizacion
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
