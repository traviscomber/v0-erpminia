'use client';

import Link from 'next/link';
import { FileSpreadsheet, FolderOpen } from 'lucide-react';
import { FinanzasDashboard } from '@/components/dashboard/finanzas-dashboard';
import { Button } from '@/components/ui/button';

export default function FinanzasPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Finanzas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Control financiero</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Revisa movimientos, balance, proveedores y costos operacionales desde las fuentes reales ya conectadas al sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/finanzas/documentos">
              <FolderOpen className="mr-2 h-4 w-4" /> Documentos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/finanzas/importar">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar movimientos
            </Link>
          </Button>
        </div>
      </section>

      <div className="[&>div>div:first-child]:hidden">
        <FinanzasDashboard />
      </div>
    </div>
  );
}
