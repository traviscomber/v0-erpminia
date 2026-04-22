'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Download, FileText } from 'lucide-react';

export default function AdquisicionesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const adquisicionesDocs = [
    { id: 'RFQ-001', type: 'RFQ', title: 'Cotización Bombas Hidráulicas', vendor: 'Hidra Minería', date: '2024-04-15', status: 'Enviado', amount: '$125,000' },
    { id: 'OC-2024-045', type: 'OC', title: 'OC Repuestos Chancadora', vendor: 'Industrial Parts', date: '2024-04-10', status: 'Aprobado', amount: '$85,500' },
    { id: 'REQ-2024-112', type: 'Requisición', title: 'Solicitud Cable Eléctrico', vendor: 'Penco', date: '2024-04-12', status: 'Pendiente', amount: '$42,300' },
    { id: 'RFQ-002', type: 'RFQ', title: 'Servicio Mantención Equipos', vendor: 'Mantec Chile', date: '2024-04-08', status: 'Cotizado', amount: '$210,000' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Adquisiciones</h1>
        <p className="text-muted-foreground">Gestiona RFQs, órdenes de compra y requisiciones</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Órdenes Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aprobadas Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inversión Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.3M</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Documentos de Procuración</CardTitle>
              <CardDescription>RFQs, órdenes de compra y requisiciones</CardDescription>
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
                  placeholder="Buscar por número, proveedor o título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {procurementDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{doc.id}</span>
                        <Badge variant="outline">{doc.type}</Badge>
                        <Badge className={doc.status === 'Aprobado' ? 'bg-green-600' : doc.status === 'Pendiente' ? 'bg-yellow-600' : 'bg-blue-600'}>
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.vendor} • {doc.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{doc.amount}</p>
                    <Button variant="ghost" size="sm" className="gap-2 mt-1">
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
