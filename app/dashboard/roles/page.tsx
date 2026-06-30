'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_PERMISSIONS, UserRole } from '@/lib/roles-config';
import { CheckCircle2, Lock } from 'lucide-react';

type RoleConfig = (typeof ROLE_PERMISSIONS)[UserRole];

export default function RolesPage() {
  const roles: UserRole[] = [
    'operador_produccion',
    'jefe_mantencion',
    'tecnico_campo',
    'responsable_bodega',
    'oficial_hse',
    'supervisor_gerencia',
  ];

  const [selectedRole, setSelectedRole] = useState<UserRole>('supervisor_gerencia');

  const roleConfig: RoleConfig = ROLE_PERMISSIONS[selectedRole];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Gestión de Roles y Permisos</h1>
        <p className="text-muted-foreground mt-2">
          Visualiza qué módulos y funciones puede acceder cada rol en el sistema
        </p>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {roles.map((role) => {
          const config = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
          const isSelected = role === selectedRole;

          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                isSelected
                  ? 'border-[var(--brand-naranja)] bg-[var(--brand-naranja)]/10'
                  : 'border-border hover:border-[var(--brand-naranja)]/50'
              }`}
            >
              <div className="text-3xl mb-2">{config.icon}</div>
              <p className="text-xs font-semibold">{config.name}</p>
            </button>
          );
        })}
      </div>

      {/* Role Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Accessible Modules */}
        <Card>
          <CardHeader>
            <CardTitle>Módulos Accesibles</CardTitle>
            <CardDescription>
              Todas las páginas y sistemas que puede acceder este rol
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {roleConfig.accessibleModules.map((module) => (
                <div key={module} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1">{module}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features & Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle>Funciones Disponibles</CardTitle>
            <CardDescription>
              Qué puede hacer este rol en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {roleConfig.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-[var(--brand-naranja)] mt-1">▸</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Widgets */}
      <Card>
        <CardHeader>
          <CardTitle>Widgets del Dashboard</CardTitle>
          <CardDescription>
            Elementos de visualización y KPIs que verá en su dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roleConfig.dashboardWidgets.map((widget) => (
              <div
                key={widget}
                className="bg-muted p-3 rounded border border-border hover:border-[var(--brand-naranja)]/50 transition-colors"
              >
                <p className="text-xs font-semibold text-center">{widget.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Matrix of Roles vs Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Acceso: Roles vs Módulos</CardTitle>
          <CardDescription>
            Vista completa de qué rol puede acceder a qué módulo
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-semibold">Módulo</th>
                {roles.map((role) => (
                  <th key={role} className="text-center py-2 px-1">
                    <span className="text-xs">{ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS].icon}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                '/dashboard',
                '/dashboard/produccion',
                '/dashboard/mantenimiento',
                '/dashboard/bodega',
                '/dashboard/hse',
                '/dashboard/documentos-gestion',
                '/dashboard/finanzas',
                '/dashboard/reportes',
                '/dashboard/integracion-completa',
              ].map((module) => (
                <tr key={module} className="border-b hover:bg-muted/30">
                  <td className="text-left py-2 px-2 text-xs">
                    <code className="bg-muted px-2 py-1 rounded">{module}</code>
                  </td>
                  {roles.map((role) => {
                    const canAccess = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS].accessibleModules.some(m =>
                      module.startsWith(m)
                    );
                    return (
                      <td key={role} className="text-center py-2 px-1">
                        {canAccess ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground mx-auto" />
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

      {/* Role Summary Cards */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Resumen por Rol</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const config = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
            return (
              <Card key={role} className="border-l-4" style={{ borderLeftColor: 'var(--brand-naranja)' }}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{config.icon}</span>
                    <div>
                      <CardTitle className="text-base">{config.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Módulos:</p>
                    <div className="flex flex-wrap gap-1">
                      {config.accessibleModules.slice(0, 3).map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {m.split('/').pop()}
                        </Badge>
                      ))}
                      {config.accessibleModules.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{config.accessibleModules.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Funciones clave:</p>
                    <ul className="text-xs space-y-1">
                      {config.features.slice(0, 3).map((f, idx) => (
                        <li key={idx} className="text-muted-foreground">
                          • {f}
                        </li>
                      ))}
                      {config.features.length > 3 && (
                        <li className="text-muted-foreground">
                          +{config.features.length - 3} más
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
