'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Clock3, RefreshCw, Users, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PersonnelSummary {
  totalHours?: number | string;
  totalEntries?: number | string;
  technicians?: number | string;
}

interface PersonnelTechnician {
  technicianId: string;
  name?: string | null;
  entries?: number | string | null;
  hours?: number | string | null;
}

interface PersonnelEntry {
  id: string;
  descripcion?: string | null;
  horas_trabajadas?: number | string | null;
  fecha?: string | null;
}

interface PersonnelResponse {
  summary?: PersonnelSummary;
  technicians?: PersonnelTechnician[];
  recentEntries?: PersonnelEntry[];
}

const fetcher = async (url: string): Promise<PersonnelResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

export function MaintenancePersonnelBoard() {
  const { data, error, isLoading, mutate } = useSWR<PersonnelResponse>('/api/maintenance/personal', fetcher);

  const summary: PersonnelSummary = data?.summary || { totalHours: 0, totalEntries: 0, technicians: 0 };
  const technicians: PersonnelTechnician[] = Array.isArray(data?.technicians) ? data.technicians : [];
  const recentEntries: PersonnelEntry[] = Array.isArray(data?.recentEntries) ? data.recentEntries : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal de mantencion</h1>
          <p className="mt-2 text-muted-foreground">Horas reales, tecnicos activos y registros recientes del modulo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void mutate()}>
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/bitacora">Bitacora</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/mantenimiento/gerencial">Gerencial</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock3 className="h-4 w-4 text-primary" />
              Horas totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number(summary.totalHours || 0).toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-blue-500" />
              Registros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalEntries || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-green-500" />
              Tecnicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.technicians || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Acceso rapido a mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/costos">
                Costo por equipo
                <Clock3 className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/componentes-mayores">
                Componentes mayores
                <Wrench className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/planificacion">
                Planificacion
                <Wrench className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/vehiculos">
                Vehiculos y QR
                <Users className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top tecnicos por horas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando personal...</div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              No fue posible cargar el personal de mantencion.
            </div>
          ) : technicians.length > 0 ? (
            technicians.map((tech) => (
              <div key={tech.technicianId} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-semibold">{tech.name || 'Tecnico'}</p>
                  <p className="text-xs text-muted-foreground">{tech.entries} registros</p>
                </div>
                <Badge variant="outline">{Number(tech.hours || 0).toFixed(1)} h</Badge>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Todavia no hay horas registradas para resumir.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ultimos registros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentEntries.length > 0 ? (
            recentEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{entry.descripcion || 'Tiempo registrado'}</p>
                  <Badge variant="outline">{Number(entry.horas_trabajadas || 0).toFixed(1)} h</Badge>
                </div>
                <p className="text-muted-foreground">{entry.fecha ? new Date(entry.fecha).toLocaleDateString('es-CL') : 'Sin fecha'}</p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay registros recientes.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
