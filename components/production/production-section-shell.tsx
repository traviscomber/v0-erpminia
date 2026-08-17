import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ProductionSectionShell({
  eyebrow = 'Producción',
  title,
  description,
  capabilities,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  capabilities: string[];
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <Badge variant="outline">Dominio operacional</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alcance del módulo</CardTitle>
          <CardDescription>Funciones que MOTIL debe centralizar en este dominio.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {capabilities.map((capability) => (
              <div key={capability} className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm">
                {capability}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {children ?? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado operacional</CardTitle>
            <CardDescription>La sección ya forma parte de Producción. Los registros operacionales se incorporarán desde su fuente real; no se muestran datos simulados.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
