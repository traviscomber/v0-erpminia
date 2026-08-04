'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, FileCheck, Scale, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const areas = [
  {
    title: 'Usuarios',
    description: 'Crear cuentas, importar usuarios y revisar el registro actual.',
    href: '/dashboard/admin/users',
    icon: Users,
    action: 'Gestionar usuarios',
  },
  {
    title: 'Roles y cargos',
    description: 'Asignar cargos y administrar la matriz de acceso por módulo.',
    href: '/dashboard/admin/roles',
    icon: ShieldCheck,
    action: 'Administrar accesos',
  },
  {
    title: 'Legal y contratos',
    description: 'Supervisar documentos, contratos, revisiones y vencimientos.',
    href: '/dashboard/legal',
    icon: Scale,
    action: 'Abrir control legal',
  },
  {
    title: 'Gestión documental',
    description: 'Acceder a contratos, empresas contratistas y respaldos asociados.',
    href: '/dashboard/documentos-gestion',
    icon: FileCheck,
    action: 'Abrir documentos',
  },
];

export default function AdministrationPage() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user || (role !== 'admin' && role !== 'superadmin')) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md border-destructive/30 bg-destructive/5 shadow-none">
          <CardContent className="flex gap-4 pt-6">
            <AlertCircle className="h-6 w-6 shrink-0 text-destructive" />
            <div>
              <h2 className="font-semibold text-destructive">Acceso denegado</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo administradores pueden acceder al centro de control.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
              Administración y control
            </Badge>
            <Badge variant="outline" className="rounded-full">
              Acceso restringido
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Centro de administración</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Gestiona cuentas, responsabilidades, permisos y control documental desde una única puerta de entrada.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/users">
            <Users className="mr-2 h-4 w-4" />
            Gestionar usuarios
          </Link>
        </Button>
      </section>

      <Card className="border-border/70 bg-muted/20 shadow-none">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Secuencia recomendada</p>
            <p className="mt-2 text-sm font-medium">1. Crear o importar usuarios</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Responsabilidad</p>
            <p className="mt-2 text-sm font-medium">2. Asignar cargos operacionales</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Acceso</p>
            <p className="mt-2 text-sm font-medium">3. Validar permisos por módulo</p>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Áreas de control</h2>
          <p className="text-sm text-muted-foreground">Accesos administrativos existentes, sin métricas simuladas ni configuraciones ficticias.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {areas.map((area) => {
            const Icon = area.icon;
            return (
              <Card key={area.href} className="group shadow-none transition-colors hover:bg-muted/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <CardTitle className="pt-3 text-base">{area.title}</CardTitle>
                  <CardDescription>{area.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full justify-between">
                    <Link href={area.href}>
                      {area.action}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
