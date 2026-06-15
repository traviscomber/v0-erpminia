import useSWR from 'swr';

type KPI = { date: string; production_tons: number; equipment_uptime: number; safety_incidents: number; environmental_compliance: number; workforce_efficiency: number; };
type Orden = { id: string; code: string; title: string; description: string; status: string; priority: string };
type InventoryItem = { id: string; sku: string; name: string; quantity: number; min_stock: number; unit_cost: number };
type Movement = { id: string; date: string; description: string; amount: number; type: string; category: string };
type Metric = { date: string; lost_time_injuries: number; near_misses: number; training_hours: number; employees_trained: number; audit_score: number };

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
};

export function useProductionKPI() {
  const { data, error, isLoading, mutate } = useSWR('/api/produccion/kpi', fetcher);
  return { kpis: (data?.kpis || []) as KPI[], error, isLoading, mutate };
}

export function useMantenimientoOrdenes() {
  const { data, error, isLoading, mutate } = useSWR('/api/mantenimiento/ordenes', fetcher);
  return { ordenes: (data?.ordenes || []) as Orden[], error, isLoading, mutate };
}

export function useBodegaInventory() {
  const { data, error, isLoading, mutate } = useSWR('/api/bodega/inventory', fetcher);
  return { inventory: (data?.inventory || []) as InventoryItem[], error, isLoading, mutate };
}

export function useFinanzasMovements() {
  const { data, error, isLoading, mutate } = useSWR('/api/finanzas/movements', fetcher);
  return { movements: (data?.movements || []) as Movement[], error, isLoading, mutate };
}

export function useHSEMetrics() {
  const { data, error, isLoading, mutate } = useSWR('/api/hse/metrics', fetcher);
  return { metrics: (data?.metrics || []) as Metric[], error, isLoading, mutate };
}

