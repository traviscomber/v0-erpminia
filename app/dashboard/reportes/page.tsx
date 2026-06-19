'use client';

import { ExportReportForm } from '@/components/reportes/export-report-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportesPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Descarga los reportes que necesitas en un solo lugar.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tipos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Mantenimiento, HSE y trazabilidad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground">Datos listos para exportar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ultima descarga</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Pendiente</p>
          </CardContent>
        </Card>
      </div>

      <ExportReportForm />
    </div>
  );
}
