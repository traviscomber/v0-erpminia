'use client';

import { useAuth } from '@/hooks/use-auth';
import { canPerform, type UserRole, type Permission } from '@/lib/rbac';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole | UserRole[];
  requiredPermission: {
    module: string;
    permission: Permission;
  };
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check role requirements
  if (requiredRole) {
    const roleArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roleArray.includes(role as UserRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive mb-2">Acceso Denegado</h3>
                  <p className="text-sm text-muted-foreground">
                    No tienes permiso para acceder a esta sección. Contacta al administrador si crees que esto es un error.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Check permission requirements
  if (requiredPermission && role) {
    if (!canPerform(role as UserRole, requiredPermission.module, requiredPermission.permission)) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive mb-2">Permiso Insuficiente</h3>
                  <p className="text-sm text-muted-foreground">
                    No tienes permisos para realizar esta acción. Contacta al administrador si crees que esto es un error.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}
