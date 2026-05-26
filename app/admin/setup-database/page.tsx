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
        throw new Error(data.error || 'Failed to create profiles table');
      }

      setStep('syncing');
      
      // Sync existing users
      const syncResponse = await fetch('/api/admin/sync-existing-users', {
        method: 'POST',
      });

      const syncData = await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(syncData.error || 'Failed to sync users');
      }

      setResult(syncData);
      setStep('complete');
    } catch (err) {
      console.error('[v0] Setup error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup de Bases de Datos</CardTitle>
          <CardDescription>
            Crear tabla profiles y sincronizar usuarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esto creará la tabla `profiles` en PostgreSQL y sincronizará todos los usuarios de Supabase Auth.
              </p>
              <Button
                onClick={handleSetupProfiles}
                className="w-full"
              >
                Iniciar Setup
              </Button>
            </div>
          )}

          {(step === 'creating' || step === 'syncing') && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-sidebar-primary" />
              <p className="text-sm font-medium">
                {step === 'creating' ? 'Creando tabla profiles...' : 'Sincronizando usuarios...'}
              </p>
            </div>
          )}

          {step === 'complete' && result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-[var(--brand-verde)]/5 border border-[var(--brand-verde)]/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-[var(--brand-verde)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Setup Completado</p>
                  <p className="text-sm text-[var(--brand-verde)] mt-1">
                    {result.synced} usuarios sincronizados
                  </p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="p-3 bg-[var(--secondary)]/5 border border-[var(--secondary)]/30 rounded-lg">
                  <p className="text-sm font-medium text-yellow-900 mb-2">Errores:</p>
                  <ul className="text-sm text-[var(--secondary)] space-y-1">
                    {result.errors.map((err: string, i: number) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full"
              >
                Ir al Dashboard
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Error en Setup</p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>

              <Button
                onClick={handleSetupProfiles}
                variant="outline"
                className="w-full"
              >
                Reintentar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
