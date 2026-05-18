'use client';

import { ReactNode } from 'react';
import { RBACEngine, Permission, Role } from '@/lib/rbac-engine';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ProtectedActionProps {
  permission: Permission;
  userRole: Role;
  children: ReactNode;
  fallback?: ReactNode;
  action?: () => void;
}

export function ProtectedAction({
  permission,
  userRole,
  children,
  fallback,
  action,
}: ProtectedActionProps) {
  const hasPermission = RBACEngine.hasPermission(userRole, permission);

  if (!hasPermission) {
    return (
      fallback || (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive rounded-md">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">
            No tienes permiso para: {RBACEngine.getPermissionDescription(permission)}
          </span>
        </div>
      )
    );
  }

  if (typeof children === 'string') {
    return (
      <Button onClick={action} disabled={!hasPermission}>
        {children}
      </Button>
    );
  }

  return <div onClick={action}>{children}</div>;
}
