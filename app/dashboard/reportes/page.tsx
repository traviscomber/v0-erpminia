'use client';

import { ExportReportForm } from '@/components/reportes/export-report-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportesPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Informes de cumplimiento, trazabilidad y exportación de datos para la operación.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reportes disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Mantención, HSE y auditoría</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado de cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground">Todos los registros listos para auditoría</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última exportación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Genera una exportación para verla aquí</p>
          </CardContent>
        </Card>
      </div>

      <ExportReportForm />

      <Card>
        <CardHeader>
          <CardTitle>Descripción de reportes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-sm">Órdenes de trabajo de mantención</p>
            <p className="text-xs text-muted-foreground">
              Registros completos con MTTR, estado, técnico y repuestos utilizados.
            </p>
          </div>

          <div>
            <p className="font-semibold text-sm">Incidentes e investigaciones HSE</p>
            <p className="text-xs text-muted-foreground">
              Incidentes de seguridad, análisis de causa raíz, acciones correctivas y estado RCA.
            </p>
          </div>

          <div>
            <p className="font-semibold text-sm">Trazabilidad y cumplimiento</p>
            <p className="text-xs text-muted-foreground">
              Bitácora completa de movimientos y transacciones con usuario, fecha y organización.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
