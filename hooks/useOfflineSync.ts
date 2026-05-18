import { useEffect, useState, useCallback } from 'react';

interface PendingRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending requests from IndexedDB
  useEffect(() => {
    const loadPendingRequests = async () => {
      try {
        const db = await openIndexedDB();
        const requests = await getAllPendingRequests(db);
        setPendingRequests(requests);
      } catch (error) {
        console.error('[useOfflineSync] Error loading pending requests:', error);
      }
    };

    loadPendingRequests();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingRequests.length > 0) {
      syncPendingRequests();
    }
  }, [isOnline]);

  const savePendingRequest = useCallback(async (request: Omit<PendingRequest, 'id' | 'timestamp'>) => {
    try {
      const db = await openIndexedDB();
      const newRequest: PendingRequest = {
        ...request,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };

      await saveToDB(db, newRequest);
      setPendingRequests((prev) => [...prev, newRequest]);

      return newRequest;
    } catch (error) {
      console.error('[useOfflineSync] Error saving pending request:', error);
      throw error;
    }
  }, []);

  const syncPendingRequests = useCallback(async () => {
    if (isSyncing || pendingRequests.length === 0) return;

    setIsSyncing(true);
    try {
      const db = await openIndexedDB();
      const results = [];

      for (const request of pendingRequests) {
        try {
          const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body,
          });

          if (response.ok) {
            await removeFromDB(db, request.id);
            results.push({ id: request.id, success: true });
          } else {
            results.push({ id: request.id, success: false, status: response.status });
          }
        } catch (error) {
          console.error(`[useOfflineSync] Error syncing ${request.url}:`, error);
          results.push({ id: request.id, success: false, error: String(error) });
        }
      }

      // Update pending requests list
      const successfulIds = new Set(results.filter((r) => r.success).map((r) => r.id));
      setPendingRequests((prev) => prev.filter((req) => !successfulIds.has(req.id)));

      return results;
    } catch (error) {
      console.error('[useOfflineSync] Sync error:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, pendingRequests]);

  const clearPendingRequests = useCallback(async () => {
    try {
      const db = await openIndexedDB();
      await clearAllPending(db);
      setPendingRequests([]);
    } catch (error) {
      console.error('[useOfflineSync] Error clearing pending requests:', error);
    }
  }, []);

  return {
    isOnline,
    pendingRequests,
    isSyncing,
    savePendingRequest,
    syncPendingRequests,
    clearPendingRequests,
  };
}

// IndexedDB helpers
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sostenibilidad-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pending-requests')) {
        db.createObjectStore('pending-requests', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline-data')) {
        db.createObjectStore('offline-data', { keyPath: 'key' });
      }
    };
  });
}

function saveToDB(db: IDBDatabase, request: PendingRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const req = store.add(request);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

function removeFromDB(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const req = store.delete(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

function getAllPendingRequests(db: IDBDatabase): Promise<PendingRequest[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readonly');
    const store = transaction.objectStore('pending-requests');
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function clearAllPending(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const req = store.clear();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}
