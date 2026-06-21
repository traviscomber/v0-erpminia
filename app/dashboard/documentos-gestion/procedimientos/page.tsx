'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock, Download, Plus, Search } from 'lucide-react';

type Procedimiento = {
  id: string;
  title: string;
  version: string;
  status: 'Vigente' | 'En revisión';
  lastReview: string;
  reviewedBy: string;
  documents: number;
};

export default function ProcedimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const procedures: Procedimiento[] = [
    {
      id: 'PROC-001',
      title: 'Procedimiento de arranque de planta',
      version: 'v2.1',
      status: 'Vigente',
      lastReview: '2024-03-15',
      reviewedBy: 'Carlos Mendoza',
      documents: 8,
    },
    {
      id: 'PROC-002',
      title: 'Protocolo de bloqueo de energía',
      version: 'v1.5',
      status: 'Vigente',
      lastReview: '2024-02-20',
      reviewedBy: 'María Rodríguez',
      documents: 5,
    },
    {
      id: 'PROC-003',
      title: 'Procedimiento de excavación segura',
      version: 'v3.0',
      status: 'En revisión',
      lastReview: '2024-04-01',
      reviewedBy: 'Juan Silva',
      documents: 12,
    },
    {
      id: 'PROC-004',
      title: 'Manejo de residuos peligrosos',
      version: 'v2.3',
      status: 'Vigente',
      lastReview: '2024-01-10',
      reviewedBy: 'Ana López',
      documents: 6,
    },
  ];

  const filteredProcedures = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return procedures;

    return procedures.filter((procedure) =>
      [procedure.id, procedure.title, procedure.version, procedure.status, procedure.lastReview, procedure.reviewedBy]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Procedimientos operacionales</h1>
        <p className="text-muted-foreground">Gestiona procedimientos, protocolos y procesos operacionales.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de procedimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="mt-1 text-xs text-muted-foreground">Documentos activos en el catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">15</div>
            <p className="mt-1 text-xs text-muted-foreground">Procedimientos listos para uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">2</div>
            <p className="mt-1 text-xs text-muted-foreground">Pendientes de actualización</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Próxima revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18 días</div>
            <p className="mt-1 text-xs text-muted-foreground">Ventana estimada de control</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Biblioteca de procedimientos</CardTitle>
              <CardDescription>Protocolos operacionales y procesos documentados.</CardDescription>
            </div>

            <Button className="gap-2 self-start">
              <Plus className="h-4 w-4" />
              Nuevo procedimiento
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar procedimientos"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {filteredProcedures.map((proc) => (
                <div
                  key={proc.id}
                  className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex flex-1 items-start gap-4">
                    {proc.status === 'Vigente' ? (
                      <CheckCircle2 className="mt-1 h-5 w-5 text-[var(--brand-verde)]" />
                    ) : (
                      <Clock className="mt-1 h-5 w-5 text-orange-600" />
                    )}

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{proc.id}</span>
                        <Badge variant="outline">{proc.version}</Badge>
                        <Badge
                          className={
                            proc.status === 'Vigente'
                              ? 'bg-[var(--brand-verde)] text-white'
                              : 'bg-[var(--secondary)] text-white'
                          }
                        >
                          {proc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{proc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Revisado por {proc.reviewedBy} • {proc.lastReview} • {proc.documents} documentos
                      </p>
                    </div>
                  </div>

                  <div className="self-end lg:self-auto">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </div>
              ))}

              {filteredProcedures.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay procedimientos que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



