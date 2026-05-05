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
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Download,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MODULES = [
  'produccion',
  'mantenimiento',
  'bodega',
  'hse',
  'documentos',
  'compras',
  'finanzas',
  'reportes',
];

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

  // Fetch users
  const { data: usersData } = useSWR('/api/admin/users', fetcher, {
    revalidateOnFocus: false,
  });

  // Fetch user permissions
  const { data: permissionsData, mutate: mutatePermissions } = useSWR(
    selectedUser ? `/api/admin/permissions?user_id=${selectedUser}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleGrantPermission = async () => {
    if (!selectedUser || !selectedActions.length) return;

    const expiresAt = tempDays > 0 ? new Date(Date.now() + tempDays * 24 * 60 * 60 * 1000) : null;

    for (const action of selectedActions) {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser,
          role: selectedRole,
          module: selectedModule,
          action,
          expires_at: expiresAt?.toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to grant permission');
      }
    }

    setSelectedActions([]);
    mutatePermissions();
  };

  const handleRevokePermission = async (permissionId: string) => {
    const response = await fetch('/api/admin/permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission_id: permissionId }),
    });

    if (response.ok) {
      mutatePermissions();
    }
  };

  const userPermissions = permissionsData?.permissions || [];
  const users = usersData?.users || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Permisos</h1>
        <p className="text-muted-foreground mt-2">Asignar permisos granulares a usuarios por módulo</p>
      </div>

      {/* Permission Grant Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Otorgar Nuevo Permiso
          </CardTitle>
          <CardDescription>Asignar permisos específicos a un usuario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Selection */}
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

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol</label>
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

            {/* Module Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Módulo</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((mod) => (
                    <SelectItem key={mod} value={mod}>
                      {mod.charAt(0).toUpperCase() + mod.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Temporary Permission */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Temporal (días, 0 = permanente)</label>
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

          {/* Actions Checkboxes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Acciones</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ACTIONS.map((action) => (
                <div key={action} className="flex items-center space-x-2">
                  <Checkbox
                    id={action}
                    checked={selectedActions.includes(action)}
                    onCheckedChange={(checked) => {
                      setSelectedActions(
                        checked
                          ? [...selectedActions, action]
                          : selectedActions.filter((a) => a !== action)
                      );
                    }}
                  />
                  <label htmlFor={action} className="text-sm font-medium cursor-pointer">
                    {action}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleGrantPermission} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Otorgar Permiso
          </Button>
        </CardContent>
      </Card>

      {/* Current Permissions Table */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Permisos Actuales del Usuario</CardTitle>
            <CardDescription>Permisos activos asignados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-4">Módulo</th>
                    <th className="text-left py-2 px-4">Acción</th>
                    <th className="text-left py-2 px-4">Estado</th>
                    <th className="text-left py-2 px-4">Vencimiento</th>
                    <th className="text-left py-2 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted-foreground">
                        No hay permisos asignados
                      </td>
                    </tr>
                  ) : (
                    userPermissions.map((perm: any) => (
                      <tr key={perm.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4">
                          <Badge variant="outline">{perm.module}</Badge>
                        </td>
                        <td className="py-2 px-4">{perm.action}</td>
                        <td className="py-2 px-4">
                          {perm.is_active ? (
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
                        <td className="py-2 px-4">
                          {perm.expires_at ? (
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {new Date(perm.expires_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Permanente</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevokePermission(perm.id)}
                          >
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

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Roles Disponibles para Minería</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
