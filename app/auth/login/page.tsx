'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      router.push('/dashboard');
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-sidebar-primary-foreground" />
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
            <CardDescription>
              ERP SegurIA - Plataforma de Gestión Minera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Correo Electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@empresa.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <Link href="/auth/register" className="text-sidebar-primary hover:underline font-semibold">
                  Regístrate aquí
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">
                Demo: usa cualquier email y contraseña
              </p>
              <div className="bg-muted p-3 rounded-lg text-xs">
                <p className="font-semibold mb-1">Credenciales de Prueba:</p>
                <p>Email: demo@seguria.cl</p>
                <p>Contraseña: cualquier texto</p>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t border-border">
                Powered by <a href="https://n3uralia.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">n3uralia</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
