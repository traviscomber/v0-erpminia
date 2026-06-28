'use client';

import Link from 'next/link';
import { Download, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MovementsImport } from '@/components/finanzas/movements-import';

export default function FinanzasImportPage() {
  const downloadTemplate = () => {
    const headers = ['DATE', 'DESCRIPTION', 'AMOUNT', 'TYPE', 'CATEGORY', 'COST_CENTER_ID'];
    const rows = [
      ['2026-06-27', 'Venta de mineral', '1500000', 'ingreso', 'operacion', ''],
      ['2026-06-27', 'Compra repuestos', '250000', 'egreso', 'mantenimiento', 'cc-001'],
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-movimientos-financieros.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar movimientos financieros</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Carga ingresos y egresos desde Excel para mantener la trazabilidad del flujo de caja con el mismo criterio que el resto de los modulos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Plantilla Excel
          </Button>
          <Button asChild>
            <Link href="/dashboard/finanzas">
              <ArrowRight className="mr-2 h-4 w-4" />
              Volver a finanzas
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-[var(--brand-verde)]" />
            Flujo de importacion
          </CardTitle>
          <CardDescription>El archivo debe traer fecha, descripcion, monto, tipo, categoria y centro de costo.</CardDescription>
        </CardHeader>
        <CardContent>
          <MovementsImport />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uso recomendado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Exporta los movimientos desde tu fuente contable o de caja.</p>
          <p>2. Asegura que `TYPE` sea `ingreso` o `egreso`.</p>
          <p>3. Sube el archivo desde esta pantalla para poblar el sistema.</p>
          <p>4. Vuelve al dashboard para revisar ingresos, egresos y balance.</p>
        </CardContent>
      </Card>
    </div>
  );
}
