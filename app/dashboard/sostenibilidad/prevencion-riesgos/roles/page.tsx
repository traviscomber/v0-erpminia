'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) return null;
  return response.json();
};

type HSERole = {
  id: string;
  name: string;
  description: string | null;
  permissions: string | null;
  is_active: boolean;
};

type HSEData = {
  data: HSERole[];
  count: number;
};

export default function RolesPage() {
  const { data: rolesData, isLoading } = useSWR<HSEData>(
    '/api/sostenibilidad/hse-canonical-data?type=roles',
    fetcher
  );

  const roles = rolesData?.data || [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Roles HSE</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {roles.length} roles de seguridad, salud y ambiente importados del sistema canónico
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-none">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-12 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : roles.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 shadow-none">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No hay roles disponibles</p>
            </CardContent>
          </Card>
        ) : (
          roles.map((role) => (
            <Card key={role.id} className="shadow-none hover:border-border hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight line-clamp-2">{role.name || 'Sin nombre'}</CardTitle>
                  <Badge variant={role.is_active ? 'secondary' : 'outline'} className="flex-shrink-0">
                    {role.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {role.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Descripción</p>
                    <p className="text-sm mt-1 line-clamp-2">{role.description}</p>
                  </div>
                )}
                {role.permissions && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Permisos</p>
                    <p className="text-sm mt-1 font-mono text-xs bg-muted p-2 rounded line-clamp-2">{role.permissions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {roles.length > 0 && (
        <Card className="shadow-none bg-muted/30 border-muted-foreground/20">
          <CardHeader>
            <CardTitle className="text-sm">Información de origen</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Total de roles canónicos: <span className="font-semibold text-foreground">{roles.length}</span></p>
            <p>Roles activos: <span className="font-semibold text-foreground">{roles.filter(r => r.is_active).length}</span></p>
            <p>Roles inactivos: <span className="font-semibold text-foreground">{roles.filter(r => !r.is_active).length}</span></p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
