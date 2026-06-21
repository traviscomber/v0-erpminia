'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Download, AlertTriangle, Shield } from 'lucide-react';

type SafetyDoc = {
  id: string;
  type: string;
  title: string;
  chemical?: string;
  category?: string;
  incident?: string;
  area?: string;
  date: string;
  status: string;
  lastUpdate: string;
};

export default function SeguridadPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const safetyDocs: SafetyDoc[] = [
    {
      id: 'MSDS-001',
      type: 'MSDS',
      title: 'Hoja de seguridad - diesel',
      chemical: 'Combustible',
      date: '2024-04-10',
      status: 'Vigente',
      lastUpdate: '2024-03-15',
    },
    {
      id: 'PROC-SEG-001',
      type: 'Protocolo',
      title: 'Protocolo de rescate en altura',
      category: 'Operacional',
      date: '2024-03-20',
      status: 'Vigente',
      lastUpdate: '2024-02-10',
    },
    {
      id: 'RPT-INC-2024-08',
      type: 'Reporte de incidente',
      title: 'Reporte de lesion en brazo - sitio sur',
      incident: 'Lesion',
      date: '2024-04-08',
      status: 'Cerrado',
      lastUpdate: '2024-04-09',
    },
    {
      id: 'AUDIT-SEG-Q1',
      type: 'Auditoria',
      title: 'Auditoria de seguridad Q1 2024',
      area: 'Planta principal',
      date: '2024-03-31',
      status: 'Completado',
      lastUpdate: '2024-03-31',
    },
  ];

  const filteredDocs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return safetyDocs;

    return safetyDocs.filter((doc) =>
      [doc.id, doc.type, doc.title, doc.chemical, doc.category, doc.incident, doc.area, doc.date, doc.status, doc.lastUpdate]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentos de seguridad</h1>
        <p className="text-muted-foreground">MSDS, protocolos de seguridad y reportes de incidentes.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">52</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">MSDS vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">28</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Incidentes del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Auditorias pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">1</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Documentos de seguridad</CardTitle>
              <CardDescription>MSDS, protocolos, incidentes y auditorias.</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos de seguridad..."
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
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex flex-1 items-center gap-4">
                    {doc.type === 'Reporte de incidente' ? (
                      <AlertTriangle className="h-5 w-5 text-[var(--brand-rojo)]" />
                    ) : (
                      <Shield className="h-5 w-5 text-[var(--secondary)]" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{doc.id}</span>
                        <Badge variant="outline">{doc.type}</Badge>
                        <Badge
                          className={
                            doc.status === 'Vigente' || doc.status === 'Completado'
                              ? 'bg-[var(--brand-verde)]'
                              : 'bg-[var(--secondary)]'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type === 'MSDS'
                          ? `Sustancia: ${doc.chemical}`
                          : `Categoria: ${doc.category || doc.incident || doc.area}`} · {doc.date}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </div>
              ))}

              {filteredDocs.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay documentos de seguridad que coincidan con la busqueda.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
