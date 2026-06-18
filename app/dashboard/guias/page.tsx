'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const guides = [
  {
    title: 'Mantenimiento y OT',
    description: 'Crea y sigue órdenes de trabajo, partes y asignación de técnicos.',
    href: '/dashboard/work-orders/create',
  },
  {
    title: 'Bodega e Inventario',
    description: 'Consulta stock, movimientos, alertas y transferencias.',
    href: '/dashboard/inventario',
  },
  {
    title: 'Alertas Operativas',
    description: 'Revisa vencimientos, criticidades y tareas pendientes.',
    href: '/dashboard/alertas',
  },
  {
    title: 'Reportes',
    description: 'Exporta información de mantenimiento, HSE y auditoría.',
    href: '/dashboard/reportes',
  },
  {
    title: 'Documentos y Aprobaciones',
    description: 'Gestiona el flujo documental y revisiones por rol.',
    href: '/dashboard/sostenibilidad/documentos-flujo',
  },
  {
    title: 'Compras',
    description: 'Revisa ordenes de compra y documentos asociados.',
    href: '/dashboard/compras',
  },
];

export default function GuidesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Centro de Guías</h1>
        <p className="mt-2 text-muted-foreground">
          Accesos rápidos para aprender y operar los módulos clave del MVP.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.href}>
            <CardHeader>
              <CardTitle className="text-xl">{guide.title}</CardTitle>
              <CardDescription>{guide.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={guide.href}>Abrir módulo</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cómo usar estas guías</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Entra al módulo que quieres operar.</p>
          <p>2. Usa la busqueda y los filtros antes de crear un nuevo registro.</p>
          <p>3. Revisa pendientes y alertas antes de cerrar una tarea.</p>
          <p>4. Si un flujo depende de otro módulo, vuelve aquí y sigue el acceso directo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
