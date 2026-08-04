'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const accessBenefits = [
  'Acceso centralizado para operación, mantención y gerencia',
  'Trazabilidad de acciones y evidencia de trabajo',
  'Menos fricción para entrar al entorno productivo',
];

function getSafeRedirect() {
  if (typeof window === 'undefined') return '/dashboard';

  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/dashboard';
  }

  return redirect;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorMessage = new URLSearchParams(window.location.search).get('error');
    if (errorMessage) {
      setError(errorMessage === 'session_expired' ? 'Tu sesión expiró. Inicia sesión nuevamente.' : errorMessage);
    }
  }, []);

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

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        window.location.assign(getSafeRedirect());
        return;
      }

      setError(data?.error || 'Credenciales inválidas');
    } catch {
      setError('No fue posible conectar con el servicio de acceso. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4" suppressHydrationWarning>
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="order-2 space-y-6 lg:order-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-cobre)]/20 bg-[var(--brand-cobre)]/10 px-4 py-2 text-sm font-medium text-[var(--brand-cobre)]">
            <ShieldCheck className="h-4 w-4" />
            Acceso seguro a Motil
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Entra a la plataforma y sigue la operación sin fricción</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Usa tus credenciales para acceder a módulos de producción, mantención, bodega, HSE y gerencia en un mismo flujo.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Wrench, title: 'Mantención', desc: 'Órdenes y ejecución en terreno' },
              { icon: CheckCircle2, title: 'Trazabilidad', desc: 'Historial y evidencia centralizada' },
              { icon: ArrowRight, title: 'Rápido acceso', desc: 'Menos pasos para comenzar a trabajar' },
            ].map((item) => (
              <Card key={item.title} className="border-border/70 bg-card/70 backdrop-blur">
                <CardContent className="pt-6">
                  <item.icon className="mb-3 h-5 w-5 text-[var(--brand-cobre)]" />
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <ul className="space-y-3 text-sm text-muted-foreground">
            {accessBenefits.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-cobre)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="order-1 lg:order-2">
          <Card className="border-border shadow-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
              <CardDescription>Motil - Plataforma Operacional Minera</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
                {error && (
                  <div className="flex gap-2 rounded border border-destructive/20 bg-destructive/10 p-3" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Correo electrónico
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@empresa.cl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                    disabled={isLoading}
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
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Si no tienes acceso, solicita tus credenciales al administrador de la operación.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
