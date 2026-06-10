'use client';

import { ExportReportForm } from '@/components/reportes/export-report-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportesPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes (Reports)</h1>
        <p className="text-muted-foreground">Compliance reports, audit trails, and data exports for stakeholders</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reports Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Maintenance, HSE, Audit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground">All records audit-ready</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Export to generate</p>
          </CardContent>
        </Card>
      </div>

      <ExportReportForm />

      <Card>
        <CardHeader>
          <CardTitle>Report Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-sm">Maintenance Work Orders</p>
            <p className="text-xs text-muted-foreground">Complete WO records with MTTR, status, technician, parts used</p>
          </div>

          <div>
            <p className="font-semibold text-sm">HSE Incidents & Investigations</p>
            <p className="text-xs text-muted-foreground">Safety incidents, root cause analysis, corrective actions, RCA status</p>
          </div>

          <div>
            <p className="font-semibold text-sm">Audit Trail & Compliance</p>
            <p className="text-xs text-muted-foreground">Complete movement log, all transactions with user/timestamp/org context</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
