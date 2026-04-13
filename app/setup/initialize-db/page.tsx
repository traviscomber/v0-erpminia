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
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>Inicializar Base de Datos</CardTitle>
          <CardDescription>
            Configura las tablas y esquema de la base de datos para n3uralia ERP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Section */}
          <div className="bg-muted p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              Esta operación creará todas las tablas necesarias para el sistema de gestión minera (Documentos, Mantenimiento, Bodega).
            </p>
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="flex gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-700">Éxito</p>
                <p className="text-sm text-green-600">{message}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">Error</p>
                <p className="text-sm text-red-600">{message}</p>
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Token de Administrador</label>
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

          {/* Button */}
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
              'Inicializar Base de Datos'
            )}
          </Button>

          {/* Info Box */}
          <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
            <p className="text-xs text-blue-600">
              <strong>Nota:</strong> Esta operación es segura y solo puede ejecutarse una vez con el token correcto. Las tablas existentes no serán borradas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
