import { useEffect, useState } from 'react';

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
}

export function useCostCenters() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCostCenters = async () => {
      try {
        const res = await fetch('/api/cost-centers');
        if (!res.ok) throw new Error('Failed to fetch cost centers');
        const data = await res.json();
        setCostCenters(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCostCenters();
  }, []);

  return { costCenters, loading, error };
}
