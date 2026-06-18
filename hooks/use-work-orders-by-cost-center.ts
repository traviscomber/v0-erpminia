'use client';

import { useEffect, useState } from 'react';

interface WorkOrderByCostCenter {
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  workOrdersCount: number;
  totalDuration: number;
}

export function useWorkOrdersByCostCenter() {
  const [data, setData] = useState<WorkOrderByCostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/maintenance/work-orders-by-cost-center');
        if (!res.ok) throw new Error('Failed to fetch');
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
