'use client';

import Link from 'next/link';
import { ArrowRight, Plus, Search, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { OperationalPipelineBoard } from '@/components/pipeline/operational-pipeline-board';

const shortcuts = [
  { href: '/dashboard/compras/control-proveedores/candidatos', label: 'Cotizar', description: 'Comparar proveedores habilitados y candidatos del rubro.', icon: Search },
  { href: '/dashboard/compras/flujo', label: 'Seguimiento', description: 'Revisar solicitudes, órdenes, recepciones y pendientes.', icon: ShoppingCart },
];

export default function ComprasPage() {
  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Abastecimiento</PageHeaderEyebrow>
          <PageHeaderTitle>Compras</PageHeaderTitle>
          <PageHeaderDescription>Compra, cotiza y sigue cada requerimiento desde un flujo simple.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild>
            <Link href="/dashboard/compras/flujo"><Plus className="h-4 w-4" />Nueva compra</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <section className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-2" aria-label="Acciones de compras">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group flex items-center gap-4 bg-card px-5 py-4 transition-colors hover:bg-muted/35">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted"><Icon className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1"><p className="font-medium">{item.label}</p><p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p></div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          );
        })}
      </section>

      <section aria-labelledby="compras-pendientes" className="space-y-3">
        <div><h2 id="compras-pendientes" className="text-lg font-semibold tracking-tight">Qué necesita atención</h2><p className="text-sm text-muted-foreground">Pendientes y siguientes pasos del flujo de abastecimiento.</p></div>
        <OperationalPipelineBoard />
      </section>
    </div>
  );
}
