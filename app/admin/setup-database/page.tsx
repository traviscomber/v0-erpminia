'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function SetupPage() {
  const [step, setStep] = useState<'idle' | 'creating' | 'syncing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSetupProfiles = async () => {
    setStep('creating');
    setError(null);

    try {
      const response = await fetch('/api/admin/setup-profiles', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear la tabla profiles');
      }

      setStep('syncing');

      const syncResponse = await fetch('/api/admin/sync-existing-users', {
        method: 'POST',
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(syncData.error || 'No se pudieron sincronizar los usuarios');
      }

      setResult(syncData);
      setStep('complete');
    } catch (err) {
      console.error('[v0] Setup error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setStep('error');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuración de bases de datos</CardTitle>
          <CardDescription>
            Crear la tabla profiles y sincronizar usuarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esto creará la tabla `profiles` en PostgreSQL y sincronizará todos los usuarios de Supabase Auth.
              </p>
              <Button onClick={handleSetupProfiles} className="w-full">
                Iniciar configuración
              </Button>
            </div>
          )}

          {(step === 'creating' || step === 'syncing') && (
            <div className="flex flex-col items-center justify-center space-y-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-sidebar-primary" />
              <p className="text-sm font-medium">
                {step === 'creating' ? 'Creando tabla profiles...' : 'Sincronizando usuarios...'}
              </p>
            </div>
          )}

          {step === 'complete' && result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Configuración completada</p>
                  <p className="mt-1 text-sm text-green-700">
                    {result.synced} usuarios sincronizados
                  </p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3">
                  <p className="mb-2 text-sm font-medium text-yellow-900">Errores:</p>
                  <ul className="space-y-1 text-sm text-yellow-800">
                    {result.errors.map((err: string, i: number) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={() => (window.location.href = '/dashboard')} className="w-full">
                Ir al dashboard
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Error en la configuración</p>
                  <p className="mt-1 text-sm text-destructive/80">{error}</p>
                </div>
              </div>

              <Button onClick={handleSetupProfiles} variant="outline" className="w-full">
                Reintentar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
