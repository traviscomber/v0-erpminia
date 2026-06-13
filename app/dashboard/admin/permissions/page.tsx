'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { BrandCard } from '@/components/ui/brand-card';
import {
  Shield,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error cargando datos');
  }
  return data;
};

const MODULES = ['produccion', 'mantenimiento', 'bodega', 'hse', 'documentos', 'compras', 'finanzas', 'reportes'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'admin'];
const MINING_ROLES = [
  { id: 'admin', label: 'Administrator', description: 'Full system access' },
  { id: 'manager', label: 'Manager', description: 'Operational management' },
  { id: 'technician', label: 'Technician', description: 'Field operations' },
  { id: 'warehouse_staff', label: 'Warehouse Staff', description: 'Inventory management' },
  { id: 'finance_officer', label: 'Finance Officer', description: 'Financial operations' },
  { id: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

export default function PermissionsPage() {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('viewer');
  const [selectedModule, setSelectedModule] = useState<string>(MODULES[0]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [tempDays, setTempDays] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: usersData, error: usersError } = useSWR('/api/admin/users', fetcher, {
    revalidateOnFocus: false,
  });

  const { data: permissionsData, mutate: mutatePermissions, error: permissionsError } = useSWR(
    selectedUser ? `/api/admin/permissions?user_id=${selectedUser}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleGrantPermission = async () => {
    if (!selectedUser || !selectedActions.length) return;

    setSubmitting(true);
    const expiresAt = tempDays > 0 ? new Date(Date.now() + tempDays * 24 * 60 * 60 * 1000) : null;

    try {
      for (const action of selectedActions) {
        const response = await fetch('/api/admin/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: selectedUser,
            role: selectedRole,
            module: selectedModule,
            action,
            expires_at: expiresAt?.toISOString() || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'No se pudo otorgar el permiso');
        }
      }

      setSelectedActions([]);
      await mutatePermissions();
    } catch (error) {
      console.error('[v0] Error granting permission:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    const response = await fetch('/api/admin/permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission_id: permissionId }),
    });

    if (response.ok) {
      await mutatePermissions();
    }
  };

  const userPermissions = permissionsData.permissions || [];
  const users = usersData.users || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion de permisos</h1>
        <p className="mt-2 text-muted-foreground">Asignacion granular por usuario, modulo y accion.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Otorgar nuevo permiso
          </CardTitle>
          <CardDescription>Asigna permisos especificos para una operacion o flujo puntual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usersError ? <p className="text-sm text-red-500">No se pudieron cargar los usuarios.</p> : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuario</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rol de referencia</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINING_ROLES.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Modulo</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temporal (dias, 0 = permanente)</label>
              <Input
                type="number"
                min="0"
                max="365"
                value={tempDays}
                onChange={(e) => setTempDays(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Acciones</label>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {ACTIONS.map((action) => (
                <div key={action} className="flex items-center space-x-2">
                  <Checkbox
                    id={action}
                    checked={selectedActions.includes(action)}
                    onCheckedChange={(checked) => {
                      setSelectedActions(
                        checked
                          ? [...selectedActions, action]
                          : selectedActions.filter((item) => item !== action)
                      );
                    }}
                  />
                  <label htmlFor={action} className="cursor-pointer text-sm font-medium">
                    {action}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleGrantPermission} className="w-full" disabled={submitting || !selectedUser || selectedActions.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            {submitting ? 'Otorgando...' : 'Otorgar permiso'}
          </Button>
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Permisos actuales del usuario</CardTitle>
            <CardDescription>Permisos individuales activos en la organizacion.</CardDescription>
          </CardHeader>
          <CardContent>
            {permissionsError ? <p className="mb-4 text-sm text-red-500">No se pudieron cargar los permisos.</p> : null}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Modulo</th>
                    <th className="px-4 py-2 text-left">Accion</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-left">Vencimiento</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted-foreground">
                        No hay permisos asignados
                      </td>
                    </tr>
                  ) : (
                    userPermissions.map((permission: any) => (
                      <tr key={permission.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-2">
                          <Badge variant="outline">{permission.module}</Badge>
                        </td>
                        <td className="px-4 py-2">{permission.action}</td>
                        <td className="px-4 py-2">
                          {permission.is_active ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Inactivo
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {permission.expires_at ? (
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {new Date(permission.expires_at).toLocaleDateString('es-CL')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Permanente</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Button size="sm" variant="destructive" onClick={() => handleRevokePermission(permission.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roles disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {MINING_ROLES.map((role) => (
              <BrandCard key={role.id} className="p-4">
                <div className="font-semibold">{role.label}</div>
                <div className="text-sm text-muted-foreground">{role.description}</div>
              </BrandCard>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
