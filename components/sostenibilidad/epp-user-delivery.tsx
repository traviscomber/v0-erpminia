'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Package, Download, Calendar, Check, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  nombre: string;
  cargo: string;
  activo: boolean;
}

interface UserEPPDelivery {
  id: string;
  userId: string;
  elemento_epp: string;
  cantidad: number;
  fecha_entrega: string;
  estado: 'nuevo' | 'usado' | 'devuelto';
  marca_modelo: string;
}

interface EPPUserDeliveryProps {
  users?: User[];
  deliveries?: UserEPPDelivery[];
  onUserSelect?: (userId: string) => void;
  onAddDelivery?: (userId: string, epp: UserEPPDelivery) => void;
}

export function EPPUserDelivery({
  users = [],
  deliveries = [],
  onUserSelect = () => {},
  onAddDelivery = () => {},
}: EPPUserDeliveryProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    onUserSelect(userId);
  };

  const filteredUsers = users.filter((user) =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const userDeliveries = deliveries.filter((d) => d.userId === selectedUserId);
  const activeDeliveries = userDeliveries.filter((d) => d.estado !== 'devuelto');
  const returnedDeliveries = userDeliveries.filter((d) => d.estado === 'devuelto');

  const getStateColor = (estado: string) => {
    switch (estado) {
      case 'nuevo':
        return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'usado':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'devuelto':
        return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  const getStateIcon = (estado: string) => {
    switch (estado) {
      case 'nuevo':
        return <Package className="w-4 h-4" />;
      case 'usado':
        return <AlertCircle className="w-4 h-4" />;
      case 'devuelto':
        return <Check className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuarios
          </CardTitle>
          <CardDescription>Selecciona un usuario para ver su historial de EPP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted"
          />

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay usuarios disponibles para entrega de EPP
              </p>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedUserId === user.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted/50 border-transparent hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="font-medium text-sm">{user.nombre}</div>
                  <div className="text-xs text-muted-foreground">{user.cargo}</div>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                EPP Asignados
              </CardTitle>
              {selectedUser && (
                <CardDescription>
                  {selectedUser.nombre} - {selectedUser.cargo}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedUser ? (
            <p className="text-muted-foreground text-center py-8">Selecciona un usuario</p>
          ) : userDeliveries.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">No hay entregas registradas para este usuario</p>
              <p className="text-xs text-muted-foreground">
                Esta vista queda lista para conectar una tabla real de entregas por usuario.
              </p>
            </div>
          ) : (
            <>
              {activeDeliveries.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4 text-primary" />
                    EPP Activos ({activeDeliveries.length})
                  </h3>
                  <div className="space-y-2">
                    {activeDeliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="p-3 bg-muted/50 rounded-lg border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{delivery.elemento_epp}</span>
                              <Badge variant="outline" className={`text-xs gap-1 ${getStateColor(delivery.estado)}`}>
                                {getStateIcon(delivery.estado)}
                                {delivery.estado}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Marca: {delivery.marca_modelo}</div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Entregado: {new Date(delivery.fecha_entrega).toLocaleDateString('es-CL')}
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-primary/20 text-primary">{delivery.cantidad}x</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {returnedDeliveries.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Devueltos ({returnedDeliveries.length})
                  </h3>
                  <div className="space-y-2">
                    {returnedDeliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="p-3 bg-muted/30 rounded-lg border border-border opacity-75"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm line-through">{delivery.elemento_epp}</span>
                              <Badge variant="outline" className="text-xs">Devuelto</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">{delivery.marca_modelo}</div>
                          </div>
                          <Badge variant="outline" className="text-gray-500">{delivery.cantidad}x</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
