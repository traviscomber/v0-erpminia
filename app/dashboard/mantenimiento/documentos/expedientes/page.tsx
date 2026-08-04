'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, FileSearch, MapPinned, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EXPEDIENT_CATALOG } from '@/lib/maintenance/expedient-catalog';

export default function MantenimientoExpedientesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDefinitions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return EXPEDIENT_CATALOG;

    return EXPEDIENT_CATALOG.filter((definition) =>
      [definition.title, definition.location, definition.description, definition.expedientKey]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--brand-cobre)]/20 bg-[var(--brand-cobre)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-cobre)]">
          Centro de expedientes
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Expedientes por equipo</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Cada activo tiene su propio expediente documental. Desde aqui se accede directo al equipo correcto, sin pasar primero por
          otro expediente ni mezclar historiales.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-[var(--brand-cobre)]" />
            Buscar expediente
          </CardTitle>
          <CardDescription>
            Filtra por nombre del equipo, ubicacion o clave interna para llegar mas rapido al expediente correcto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ej: CAT 938H N2, generador, scoop..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredDefinitions.map((definition) => (
          <Card key={definition.expedientKey}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{definition.title}</span>
                <span className="text-sm text-muted-foreground">{definition.summary.records} registros</span>
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <MapPinned className="h-4 w-4" />
                {definition.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{definition.description}</p>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Clave:</span> {definition.expedientKey}
                </p>
                <p>
                  <span className="font-semibold text-foreground">OT historicas:</span>{' '}
                  {definition.summary.categories.ot_historica}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Arbol de fallas:</span>{' '}
                  {definition.summary.categories.arbol_fallas}
                </p>
              </div>
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

      {filteredDefinitions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No encontramos expedientes con ese filtro. Prueba con el nombre del equipo o con parte de la ubicacion.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
