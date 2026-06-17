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
        throw new Error(`Error HTTP: estado ${response.status}`);
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

          {/* Mensajes de estado */}
          {status === 'success' && (
            <div className="flex gap-3 p-4 bg-[var(--brand-verde)]/10 rounded-lg border border-green-500/30">
              <CheckCircle2 className="h-5 w-5 text-[var(--brand-verde)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--brand-verde)]">Éxito</p>
                <p className="text-sm text-[var(--brand-verde)]">{message}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex gap-3 p-4 bg-[var(--brand-rojo)]/10 rounded-lg border border-[var(--brand-rojo)]/20/30">
              <AlertCircle className="h-5 w-5 text-[var(--brand-rojo)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--brand-rojo)]">Error</p>
                <p className="text-sm text-[var(--brand-rojo)]">{message}</p>
              </div>
            </div>
          )}

          {/* Seccion de entrada */}
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

          {/* Boton */}
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

          {/* Caja informativa */}
          <div className="bg-[var(--secondary)]/10 p-4 rounded-lg border border-[var(--secondary)]/20/30">
            <p className="text-xs text-[var(--secondary)]">
              <strong>Nota:</strong> Esta operación es segura y solo puede ejecutarse una vez con el token correcto. Las tablas existentes no serán borradas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
