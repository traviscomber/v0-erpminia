'use client';

import { AlertCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { UsersImportXls } from '@/components/admin/users-import-xls';
import { UsersList } from '@/components/admin/users-list';

export default function AdminUsersPage() {
  const { user, loading, role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImport, setShowImport] = useState(false);

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

      {showImport && (
        <UsersImportXls onImportComplete={() => {
          setRefreshKey((prev) => prev + 1);
          setShowImport(false);
        }} />
      )}

      {!showImport && (
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Importar usuarios desde XLS
        </button>
      )}

      <UsersList key={refreshKey} />

      <Card className="border-border/40 bg-muted/20">
        <CardContent className="flex items-center justify-between pt-6">
          <p className="text-sm text-muted-foreground">
            Los permisos de cada usuario se definen en la{' '}
            <strong className="text-foreground">Matriz de roles por cargo</strong>.
          </p>
          <a
            href="/dashboard/admin/roles"
            className="inline-flex items-center gap-1 rounded-md bg-sidebar-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Ver matriz de roles
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
