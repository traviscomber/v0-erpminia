import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpedientBatchView } from '@/components/maintenance/expedient-batch-view';
import { EXPEDIENT_CATALOG, getExpedientDefinition } from '@/lib/maintenance/expedient-catalog';

const catDefinition = getExpedientDefinition('cat-938h-n1');

export default function MantenimientoExpedientesPage() {
  if (!catDefinition) {
    return null;
  }

  const otherDefinitions = EXPEDIENT_CATALOG.filter((definition) => definition.expedientKey !== 'cat-938h-n1');

  return (
    <div className="space-y-6">
      <ExpedientBatchView definition={catDefinition} />

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Otros expedientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada activo mantiene su propia lectura canonica para no mezclar OT historicas, fallas y piezas reemplazadas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {otherDefinitions.map((definition) => (
            <Card key={definition.expedientKey}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{definition.title}</span>
                  <span className="text-sm text-muted-foreground">{definition.summary.records} registros</span>
                </CardTitle>
                <CardDescription>{definition.location}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{definition.description}</p>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/mantenimiento/documentos/expedientes/${definition.expedientKey}`}>
                    Abrir expediente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
