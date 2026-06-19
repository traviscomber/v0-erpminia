'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function InitializeDBPage() {
  const [adminToken, setAdminToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleInitialize = async () => {
    if (!adminToken.trim()) {
      setStatus('error');
      setMessage('Por favor ingresa el token de administrador');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/admin/init-db', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      await response.json();
      setStatus('success');
      setMessage('Base de datos inicializada exitosamente');
      setAdminToken('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Error al inicializar la base de datos');
      console.error('[v0] Initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>Inicializar base de datos</CardTitle>
          <CardDescription>
            Configura las tablas y el esquema de la base de datos para n3uralia ERP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              Esta operación creará todas las tablas necesarias para el sistema de gestión minera
              (Documentos, Mantenimiento y Bodega).
            </p>
          </div>

          {status === 'success' && (
            <div className="flex gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <div>
                <p className="font-semibold text-green-700">Éxito</p>
                <p className="text-sm text-green-700">{message}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Error</p>
                <p className="text-sm text-destructive">{message}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium">Token de administrador</label>
            <Input
              type="password"
              placeholder="Ingresa el token administrativo"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              disabled={isLoading}
              className="bg-input"
            />
            <p className="text-xs text-muted-foreground">
              El token se encuentra en las variables de entorno (ADMIN_INIT_TOKEN)
            </p>
          </div>

          <Button
            onClick={handleInitialize}
            disabled={isLoading || !adminToken.trim()}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inicializando...
              </>
            ) : (
              'Inicializar base de datos'
            )}
          </Button>

          <div className="rounded-lg border border-secondary/20 bg-secondary/10 p-4">
            <p className="text-xs text-secondary">
              <strong>Nota:</strong> Esta operación es segura y solo puede ejecutarse una vez con el
              token correcto. Las tablas existentes no serán borradas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
