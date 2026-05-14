'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, AlertCircle, Edit, Trash2, Download, Package } from 'lucide-react';
import useSWR from 'swr';

interface EPP {
  id: string;
  cargo_puesto: string;
  elemento_epp: string;
  cantidad_elemento: number;
  marca_modelo: string;
  frecuencia_reemplazo: string;
  activo: boolean;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function EPPPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCargo, setSelectedCargo] = useState<string>('');

  const { data: epp = [], isLoading } = useSWR('/api/sostenibilidad/epp', fetcher);

  const eqqData = epp.data || [];
  const cargos = [...new Set(eqqData.map((item: EPP) => item.cargo_puesto))];

  const filteredEPP = eqqData.filter((item: EPP) =>
    (item.elemento_epp.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.cargo_puesto.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedCargo || item.cargo_puesto === selectedCargo)
  );

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Artículos de EPP</h1>
          <p className="text-muted-foreground">Equipos de Protección Personal por puesto de trabajo</p>
        </div>
        <Button className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo EPP
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <Input
          placeholder="Buscar elemento EPP o cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-64"
        />
        <select 
          value={selectedCargo}
          onChange={(e) => setSelectedCargo(e.target.value)}
          className="px-3 py-2 bg-background border border-white/10 rounded-md text-sm"
        >
          <option value="">Todos los cargos</option>
          {cargos.map((cargo) => (
            <option key={cargo} value={cargo}>{cargo}</option>
          ))}
        </select>
        <Button variant="outline" size="icon">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total EPP Activo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eqqData.filter((e: EPP) => e.activo).length}</div>
            <p className="text-xs text-muted-foreground">Artículos vigentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cargos Cubiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cargos.length}</div>
            <p className="text-xs text-muted-foreground">Puestos de trabajo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Elementos Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{[...new Set(eqqData.map((e: EPP) => e.elemento_epp))].length}</div>
            <p className="text-xs text-muted-foreground">Tipos distintos</p>
          </CardContent>
        </Card>
      </div>

      {/* EPP Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de EPP por Cargo</CardTitle>
          <CardDescription>Especificaciones técnicas, cantidad y frecuencia de reemplazo</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredEPP.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay EPP registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-medium">Cargo</th>
                    <th className="text-left py-3 px-4 font-medium">Elemento EPP</th>
                    <th className="text-left py-3 px-4 font-medium">Cantidad</th>
                    <th className="text-left py-3 px-4 font-medium">Marca/Modelo</th>
                    <th className="text-left py-3 px-4 font-medium">Frecuencia Reemplazo</th>
                    <th className="text-left py-3 px-4 font-medium">Estado</th>
                    <th className="text-right py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEPP.map((item: EPP) => (
                    <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition">
                      <td className="py-3 px-4 font-medium">{item.cargo_puesto}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          {item.elemento_epp}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline">{item.cantidad_elemento}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{item.marca_modelo || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{item.frecuencia_reemplazo}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={item.activo ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Historial">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Eliminar">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts about expiring EPP */}
      <Card className="mt-6 border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            EPP Próximo a Reemplazarse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay EPP vencidos en el próximo mes</p>
        </CardContent>
      </Card>
    </div>
  );
}
