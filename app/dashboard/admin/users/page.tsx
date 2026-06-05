'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { UsersList } from '@/components/admin/users-list';
import { AlertCircle, Users } from 'lucide-react';
import { useState } from 'react';

export default function AdminUsersPage() {
  const { user, loading, role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sidebar-primary"></div>
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
                Solo administradores pueden acceder a esta seccion.
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
        <h1 className="text-3xl font-bold">Gestion de usuarios</h1>
      </div>

      <CreateUserForm onUserCreated={() => setRefreshKey((prev) => prev + 1)} />
      <UsersList key={refreshKey} />

      <Card className="border-[var(--secondary)]/30 bg-[var(--secondary)]/5">
        <CardContent className="space-y-3 pt-6">
          <div>
            <h3 className="font-semibold text-blue-900">Informacion de roles</h3>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-blue-800">
              <li><strong>Admin:</strong> acceso total a todos los modulos</li>
              <li><strong>Manager:</strong> gestion de operaciones y aprobaciones</li>
              <li><strong>Technician:</strong> acceso a mantenimiento y documentos</li>
              <li><strong>Warehouse Staff:</strong> gestion de bodega e inventario</li>
              <li><strong>Finance Officer:</strong> gestion de finanzas y compras</li>
              <li><strong>Viewer:</strong> lectura general de modulos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
