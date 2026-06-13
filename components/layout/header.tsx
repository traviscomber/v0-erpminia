'use client';

import { Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';

export function Header() {
  const { user, role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold">Motil</h1>
            <p className="text-xs text-muted-foreground">Gestión Operacional Minera</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Producción
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{user.name || user.email || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground capitalize">{role || 'Sin rol'}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
