'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        window.location.href = '/dashboard';
        return;
      }

      setError(data.error || 'Credenciales inválidas');
      setIsLoading(false);
    } catch {
      setError('Error al iniciar sesión');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" suppressHydrationWarning>
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
            <CardDescription>Motil - Plataforma Operacional Minera</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
              {error && (
                <div className="flex gap-2 rounded border border-destructive/20 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Correo electrónico</label>
                <Input
                  type="email"
                  placeholder="usuario@empresa.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  suppressHydrationWarning
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña</label>
                <Input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  required
                  suppressHydrationWarning
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading} suppressHydrationWarning>
                {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
