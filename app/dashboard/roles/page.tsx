'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { rolePermissions, type UserRole, type Permission } from '@/lib/rbac';
import { CheckCircle2, Lock } from 'lucide-react';

const ROLES: UserRole[] = ['superadmin', 'admin', 'manager', 'technician', 'warehouse_staff', 'finance_officer', 'viewer'];
const MODULES = ['compras', 'bodega', 'finanzas', 'mantenimiento', 'documentos'];
const PERMISSIONS: Permission[] = ['create', 'read', 'update', 'delete', 'approve', 'export'];

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Súperadministrador',
  admin: 'Administrador',
  manager: 'Gerente',
  technician: 'Técnico',
  warehouse_staff: 'Bodega',
  finance_officer: 'Finanzas',
  viewer: 'Solo lectura',
};

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');
  const roleConfig = rolePermissions[selectedRole];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Gestión de Roles y Permisos</h1>
        <p className="mt-2 text-muted-foreground">
          Vista operativa del RBAC real que usa el sistema para usuarios, módulos y acciones.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        {ROLES.map((role) => {
          const isSelected = role === selectedRole;
          const moduleCount = Object.keys(rolePermissions[role] || {}).length;

          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`rounded-lg border-2 p-3 text-center transition-all ${
                isSelected
                  ? 'border-[var(--brand-naranja)] bg-[var(--brand-naranja)]/10'
                  : 'border-border hover:border-[var(--brand-naranja)]/50'
              }`}
            >
              <p className="text-sm font-semibold">{ROLE_LABELS[role]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{moduleCount} módulos</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Módulos accesibles</CardTitle>
            <CardDescription>Acceso por módulo para el rol seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {MODULES.map((module) => {
              const permissions = roleConfig[module] || [];
              const allowed = permissions.length > 0;

              return (
                <div key={module} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{module}</p>
                    <p className="text-xs text-muted-foreground">
                      {allowed ? permissions.join(', ') : 'Sin acceso'}
                    </p>
                  </div>
                  {allowed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen del rol</CardTitle>
            <CardDescription>Capacidades base del rol seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(roleConfig).map(([module, permissions]) => (
              <div key={module} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium capitalize">{module}</span>
                  <Badge variant="outline">{permissions.length} permisos</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {permissions.map((permission) => (
                    <Badge key={`${module}-${permission}`} variant="secondary" className="capitalize">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz rápida de acceso</CardTitle>
          <CardDescription>Permisos principales por módulo y rol</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Módulo</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-2 py-2 text-center">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((module) => (
                <tr key={module} className="border-b">
                  <td className="px-2 py-2 capitalize">{module}</td>
                  {ROLES.map((role) => {
                    const canRead = (rolePermissions[role][module] || []).includes('read');
                    return (
                      <td key={`${role}-${module}`} className="px-2 py-2 text-center">
                        {canRead ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="mx-auto h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

