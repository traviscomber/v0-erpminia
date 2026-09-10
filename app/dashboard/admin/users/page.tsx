'use client';

import { AlertCircle, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreateUserForm } from '@/components/admin/create-user-form';
import { UsersList } from '@/components/admin/users-list';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';

export default function AdminUsersPage() {
  const { user, loading, role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-b-primary" /></div>;

  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    return <div className="flex min-h-[50vh] items-center justify-center p-4"><Card className="max-w-md border-destructive/30 bg-destructive/5"><CardContent className="flex gap-3 p-4"><AlertCircle className="h-5 w-5 shrink-0 text-destructive" /><div><h2 className="font-semibold text-destructive">Acceso denegado</h2><p className="mt-1 text-sm text-muted-foreground">Solo administradores pueden acceder a esta sección.</p></div></CardContent></Card></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader>
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <PageHeaderContent>
            <PageHeaderEyebrow>Administración</PageHeaderEyebrow>
            <PageHeaderTitle>Usuarios</PageHeaderTitle>
            <PageHeaderDescription>Administra identidad, cargo, estado y rol del equipo desde un solo lugar.</PageHeaderDescription>
          </PageHeaderContent>
          <Button onClick={() => setShowCreate((current) => !current)} className="min-h-10 shrink-0 self-start md:self-auto">
            {showCreate ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showCreate ? 'Cerrar alta' : 'Nuevo usuario'}
          </Button>
        </div>
      </PageHeader>

      {showCreate ? (
        <section aria-label="Alta de usuario" className="max-w-3xl">
          <CreateUserForm onUserCreated={() => {
            setRefreshKey((prev) => prev + 1);
            setShowCreate(false);
          }} />
        </section>
      ) : null}

      <section aria-label="Gestión de usuarios">
        <UsersList key={refreshKey} />
      </section>
    </div>
  );
}
