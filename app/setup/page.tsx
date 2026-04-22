'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const createDemoUser = async () => {
    setIsLoading(true);
    setResult({ type: null, message: '' });

    try {
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'demo@n3uralia.com',
          password: 'DemoPass123!',
          full_name: 'Admin Demo',
          role: 'admin',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: 'success',
          message: `✅ Usuario creado exitosamente!\n\nEmail: demo@n3uralia.com\nContraseña: DemoPass123!`,
        });
      } else {
        setResult({
          type: 'error',
          message: `❌ Error: ${data.error || 'No se pudo crear el usuario'}`,
        });
      }
    } catch (err) {
      setResult({
        type: 'error',
        message: `❌ Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Setup - Crear Usuario Demo</CardTitle>
            <CardDescription>
              Crea el usuario demo para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.type === 'success' && (
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-700 whitespace-pre-line">{result.message}</div>
              </div>
            )}

            {result.type === 'error' && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm text-destructive whitespace-pre-line">{result.message}</div>
              </div>
            )}

            <div className="space-y-3 p-3 bg-muted rounded-lg text-sm">
              <p className="font-semibold">Credenciales de Demo:</p>
              <p>
                <span className="font-mono text-xs bg-background px-2 py-1 rounded">
                  demo@n3uralia.com
                </span>
              </p>
              <p>
                <span className="font-mono text-xs bg-background px-2 py-1 rounded">
                  DemoPass123!
                </span>
              </p>
            </div>

            <Button
              onClick={createDemoUser}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando usuario...
                </>
              ) : (
                'Crear Usuario Demo'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Después de crear el usuario, puedes{' '}
              <a href="/auth/login" className="text-sidebar-primary hover:underline font-semibold">
                inicia sesión aquí
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
