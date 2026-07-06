'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[v0] Logout button clicked');
      await logout();
      // Router push is handled in the logout function
    } catch (err) {
      console.error('[v0] Logout button error:', err);
      setError('Error al cerrar sesión');
      setIsLoading(false);
      
      // Force redirect anyway
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      onClick={handleLogout}
      disabled={isLoading}
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? 'Cerrando...' : 'Cerrar Sesión'}
    </Button>
  );
}
