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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar-primary"></div>
      </div>
    );
  }

  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md border-[var(--brand-rojo)]/30 bg-[var(--brand-rojo)]/5">
          <CardContent className="flex gap-4 pt-6">
            <AlertCircle className="h-6 w-6 text-[var(--brand-rojo)] flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-red-900">Acceso Denegado</h2>
              <p className="text-sm text-[var(--brand-rojo)] mt-1">
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
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-8 w-8 text-sidebar-primary" />
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
      </div>

      {/* Create User Form */}
      <CreateUserForm onUserCreated={() => setRefreshKey(prev => prev + 1)} />

      {/* Users List */}
      <UsersList key={refreshKey} />

      {/* Info Card */}
      <Card className="bg-[var(--secondary)]/5 border-[var(--secondary)]/30">
        <CardContent className="pt-6 space-y-3">
          <div>
            <h3 className="font-semibold text-blue-900">Información de Roles</h3>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
              <li><strong>Admin:</strong> Acceso total a todos los módulos</li>
              <li><strong>Manager:</strong> Gestión de operaciones y aprobaciones</li>
              <li><strong>Technician:</strong> Acceso a mantenimiento y documentos</li>
              <li><strong>Warehouse Staff:</strong> Gestión de bodega e inventario</li>
              <li><strong>Finance Officer:</strong> Gestión de finanzas y compras</li>
              <li><strong>Viewer:</strong> Lectura de todos los módulos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
