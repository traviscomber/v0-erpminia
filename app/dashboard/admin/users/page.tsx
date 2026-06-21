'use client';

import { AlertCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { UsersList } from '@/components/admin/users-list';

export default function AdminUsersPage() {
  const { user, loading, role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sidebar-primary" />
      </div>
    );
  }

  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5">
          <CardContent className="flex gap-4 pt-6">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-[var(--brand-rojo)]" />
            <div>
              <h2 className="font-semibold text-red-900">Acceso denegado</h2>
              <p className="mt-1 text-sm text-[var(--brand-rojo)]">
                Solo administradores pueden acceder a esta sección.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-8 w-8 text-sidebar-primary" />
        <h1 className="text-3xl font-bold">Gestión de usuarios</h1>
      </div>

      <CreateUserForm onUserCreated={() => setRefreshKey((prev) => prev + 1)} />
      <UsersList key={refreshKey} />

      <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
        <CardContent className="space-y-3 pt-6">
          <div>
            <h3 className="font-semibold text-blue-900">Información de roles</h3>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-blue-800">
              <li>
                <strong>Administrador:</strong> acceso total a todos los módulos
              </li>
              <li>
                <strong>Gerente:</strong> gestión de operaciones y aprobaciones
              </li>
              <li>
                <strong>Técnico:</strong> acceso a mantenimiento y documentos
              </li>
              <li>
                <strong>Personal de bodega:</strong> gestión de bodega e inventario
              </li>
              <li>
                <strong>Encargado de finanzas:</strong> gestión de finanzas y compras
              </li>
              <li>
                <strong>Solo lectura:</strong> lectura general de módulos
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
