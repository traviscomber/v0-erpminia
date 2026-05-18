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
      <Alert className={isOnline ? 'bg-secondary/5 border-secondary' : 'bg-destructive/5 border-destructive'}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-secondary" />
                {pendingRequests.length > 0 ? (
                  <AlertDescription>
                    {isSyncing ? 'Syncing' : `${pendingRequests.length} pending`}
                  </AlertDescription>
                ) : (
                  <AlertDescription>Back online</AlertDescription>
                )}
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <AlertDescription>You're offline - changes will sync when online</AlertDescription>
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
              {isSyncing ? 'Syncing' : 'Sync'}
            </Button>
          )}
        </div>
      </Alert>
    </div>
  );
}
