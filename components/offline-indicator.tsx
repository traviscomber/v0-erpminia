'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineIndicator() {
  const { isOnline, pendingRequests, isSyncing, syncPendingRequests } = useOfflineSync();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    setShowAlert(!isOnline || pendingRequests.length > 0);
  }, [isOnline, pendingRequests]);

  if (!showAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className={isOnline ? 'border-secondary bg-secondary/5' : 'border-destructive bg-destructive/5'}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-secondary" />
                {pendingRequests.length > 0 ? (
                  <AlertDescription>
                    {isSyncing ? 'Sincronizando' : `${pendingRequests.length} pendientes`}
                  </AlertDescription>
                ) : (
                  <AlertDescription>Conectado nuevamente</AlertDescription>
                )}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <AlertDescription>Sin conexión. Los cambios se sincronizarán al volver a estar en línea.</AlertDescription>
              </>
            )}
          </div>
          {pendingRequests.length > 0 && isOnline && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncPendingRequests()}
              disabled={isSyncing}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando' : 'Sincronizar'}
            </Button>
          )}
        </div>
      </Alert>
    </div>
  );
}
