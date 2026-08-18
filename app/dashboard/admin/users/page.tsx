'use client';

import { AlertCircle, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { UsersImportXls } from '@/components/admin/users-import-xls';
import { UsersList } from '@/components/admin/users-list';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';

export default function AdminUsersPage() {
  const { user, loading, role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImport, setShowImport] = useState(false);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-b-primary" /></div>;

  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    return <div className="flex min-h-[50vh] items-center justify-center p-4"><Card className="max-w-md border-destructive/30 bg-destructive/5"><CardContent className="flex gap-3 p-4"><AlertCircle className="h-5 w-5 shrink-0 text-destructive" /><div><h2 className="font-semibold text-destructive">Acceso denegado</h2><p className="mt-1 text-sm text-muted-foreground">Solo administradores pueden acceder a esta sección.</p></div></CardContent></Card></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Administración</PageHeaderEyebrow>
          <PageHeaderTitle>Usuarios</PageHeaderTitle>
          <PageHeaderDescription>Crea cuentas y revisa quién tiene acceso. El cargo y los permisos se administran después desde Roles y cargos.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" size="sm" onClick={() => setShowImport((value) => !value)}>
            <Upload className="h-4 w-4" />{showImport ? 'Cerrar importación' : 'Importar usuarios'}
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {showImport ? <UsersImportXls onImportComplete={() => { setRefreshKey((prev) => prev + 1); setShowImport(false); }} /> : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(320px,.7fr)_minmax(0,1.3fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><h2 className="font-semibold">Crear usuario</h2></div>
          <CreateUserForm onUserCreated={() => setRefreshKey((prev) => prev + 1)} />
        </div>
        <div className="space-y-3">
          <div><h2 className="font-semibold">Usuarios registrados</h2><p className="mt-1 text-sm text-muted-foreground">Consulta cuentas existentes antes de asignar o modificar cargos.</p></div>
          <UsersList key={refreshKey} />
        </div>
      </section>
    </div>
  );
}
