import { useEffect, useState } from 'react';
import { sortCostCenters, type CostCenterRecord } from '@/lib/cost-centers';

export function useCostCenters() {
  const [costCenters, setCostCenters] = useState<CostCenterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchCostCenters = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/cost-centers', { credentials: 'include' });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(payload?.error || 'No se pudieron cargar los centros de costo');
        }

        setCostCenters(Array.isArray(payload) ? sortCostCenters(payload) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setCostCenters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCostCenters();
  }, [reloadKey]);

  return {
    costCenters,
    loading,
    error,
    reload: () => setReloadKey((value) => value + 1),
  };
}
