'use client';

import Link from 'next/link';
import { FileText, RefreshCw, Upload } from 'lucide-react';
import { BodegaDashboard } from '@/components/dashboard/bodega-dashboard';
import { Button } from '@/components/ui/button';

export default function BodegaPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Abastecimiento · Inventario</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Bodega e inventario</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Consulta existencias, niveles de reposición, valorización y estructura de familias usando el inventario real disponible.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/bodega/documentos">
              <FileText className="mr-2 h-4 w-4" /> Documentos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/bodega/importar-datos">
              <Upload className="mr-2 h-4 w-4" /> Importar inventario
            </Link>
          </Button>
        </div>
      </section>

      <div className="[&>div]:min-h-0 [&>div]:p-0 [&>div>div:first-child]:hidden">
        <BodegaDashboard />
      </div>
    </div>
  );
}
