'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Download, Clock, CheckCircle2 } from 'lucide-react';

export default function ProcedimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const procedures = [
    { id: 'PROC-001', title: 'Procedimiento de Arranque de Planta', version: 'v2.1', status: 'Vigente', lastReview: '2024-03-15', reviewedBy: 'Carlos Mendoza', documents: 8 },
    { id: 'PROC-002', title: 'Protocolo de Bloqueo de Energía', version: 'v1.5', status: 'Vigente', lastReview: '2024-02-20', reviewedBy: 'María Rodríguez', documents: 5 },
    { id: 'PROC-003', title: 'Procedimiento de Excavación Segura', version: 'v3.0', status: 'Revisión', lastReview: '2024-04-01', reviewedBy: 'Juan Silva', documents: 12 },
    { id: 'PROC-004', title: 'Manejo de Residuos Peligrosos', version: 'v2.3', status: 'Vigente', lastReview: '2024-01-10', reviewedBy: 'Ana López', documents: 6 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Procedimientos Operacionales</h1>
        <p className="text-muted-foreground">Gestiona procedimientos, protocolos y procesos operacionales</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Procedimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">15</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En Revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Próxima Revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18 días</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Procedimientos</CardTitle>
              <CardDescription>Protocolos operacionales y procesos documentados</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Procedimiento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar procedimientos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {procedures.map((proc) => (
                <div key={proc.id} className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    {proc.status === 'Vigente' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{proc.id}</span>
                        <Badge variant="outline">{proc.version}</Badge>
                        <Badge className={proc.status === 'Vigente' ? 'bg-green-600' : 'bg-yellow-600'}>
                          {proc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{proc.title}</p>
                      <p className="text-xs text-muted-foreground">Revisado por {proc.reviewedBy} • {proc.lastReview} • {proc.documents} documentos</p>
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
