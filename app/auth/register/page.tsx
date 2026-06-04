'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(pwd)) return 'Debe contener mayúscula';
    if (!/[0-9]/.test(pwd)) return 'Debe contener número';
    if (!/[!@#$%^&*]/.test(pwd)) return 'Debe contener símbolo (!@#$%^&*)';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validations
    if (!email || !password || !confirmPassword || !fullName) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(`Contraseña débil: ${passwordError}`);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'operador_produccion', // Default role
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (err) {
      setError('Error al registrarse. Intenta de nuevo.');
      setIsLoading(false);
    }
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

        {/* Register Card */}
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
            <CardDescription>Motil — Plataforma Operacional Minera</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[var(--brand-verde)]" />
                <p className="font-semibold text-center">¡Registro exitoso!</p>
                <p className="text-sm text-muted-foreground text-center">
                  Redirigiendo a login en 2 segundos...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium">
                    Nombre Completo
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="bg-input"
                  />
                </div>

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
                    disabled={isLoading}
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
                    disabled={isLoading}
                    required
                    className="bg-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres, mayúscula, número y símbolo (!@#$%^&*)
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirmar Contraseña
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="bg-input"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Registrando...' : 'Crear Cuenta'}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link href="/auth/login" className="text-sidebar-primary hover:underline font-semibold">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center pt-4">
                Desarrollado con <a href="https://n3uralia.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">n3uralia</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
