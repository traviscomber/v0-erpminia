'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Download, AlertTriangle, Shield } from 'lucide-react';

export default function SeguridadPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const safetyDocs = [
    { id: 'MSDS-001', type: 'MSDS', title: 'Hoja Seguridad - Diésel', chemical: 'Combustible', date: '2024-04-10', status: 'Vigente', lastUpdate: '2024-03-15' },
    { id: 'PROC-SEG-001', type: 'Protocolo', title: 'Protocolo de Rescate en Altura', category: 'Operacional', date: '2024-03-20', status: 'Vigente', lastUpdate: '2024-02-10' },
    { id: 'RPT-INC-2024-08', type: 'Reporte Incidente', title: 'Reporte Lesión en Brazo - Sitio Sur', incident: 'Lesión', date: '2024-04-08', status: 'Cerrado', lastUpdate: '2024-04-09' },
    { id: 'AUDIT-SEG-Q1', type: 'Auditoría', title: 'Auditoría Seguridad Q1 2024', area: 'Planta Principal', date: '2024-03-31', status: 'Completado', lastUpdate: '2024-03-31' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentos de Seguridad</h1>
        <p className="text-muted-foreground">MSDS, protocolos de seguridad y reportes de incidentes</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">52</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">MSDS Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-verde)]">28</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Incidentes Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--brand-rojo)]">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Auditorías Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">1</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Documentos de Seguridad</CardTitle>
              <CardDescription>MSDS, protocolos, incidentes y auditorías</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar documentos de seguridad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {safetyDocs.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    {doc.type === 'Reporte Incidente' ? (
                      <AlertTriangle className="h-5 w-5 text-[var(--brand-rojo)]" />
                    ) : (
                      <Shield className="h-5 w-5 text-[var(--secondary)]" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{doc.id}</span>
                        <Badge variant="outline">{doc.type}</Badge>
                        <Badge className={doc.status === 'Vigente' || doc.status === 'Completado' ? 'bg-[var(--brand-verde)]' : 'bg-[var(--secondary)]'}>
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type === 'MSDS' ? `Sustancia: ${doc.chemical}` : `Categoría: ${doc.category || doc.incident || doc.area}`} • {doc.date}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
