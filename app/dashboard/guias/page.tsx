'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const guides = [
  {
    title: 'Mantenimiento y OT',
    description: 'Crea y sigue ordenes de trabajo, partes y asignacion de tecnicos.',
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
    description: 'Exporta informacion de mantenimiento, HSE y auditoria.',
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
        <h1 className="text-4xl font-bold">Centro de Guias</h1>
        <p className="mt-2 text-muted-foreground">
          Accesos rapidos para aprender y operar los modulos clave del MVP.
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
                <Link href={guide.href}>Abrir modulo</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como usar estas guias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Entra al modulo que quieres operar.</p>
          <p>2. Usa la busqueda y los filtros antes de crear un nuevo registro.</p>
          <p>3. Revisa pendientes y alertas antes de cerrar una tarea.</p>
          <p>4. Si un flujo depende de otro modulo, vuelve aqui y sigue el acceso directo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
