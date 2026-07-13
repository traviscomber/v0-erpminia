import useSWR from 'swr';
import { useState, useMemo } from 'react';
import { formatCategoryLabel, normalizeText } from '@/lib/bodega-normalization';

type KPI = { date: string; production_tons: number; equipment_uptime: number; safety_incidents: number; environmental_compliance: number; workforce_efficiency: number; };
type Orden = {
  id: string;
  code?: string;
  order_number?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  asset_name?: string;
  scheduled_date?: string | null;
  assigned_to_name?: string | null;
};
type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  category?: string;
  description?: string;
};
type Movement = { id: string; date: string; description: string; amount: number; type: string; category: string };
type Metric = { date: string; lost_time_injuries: number; near_misses: number; training_hours: number; employees_trained: number; audit_score: number };

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) {
    console.error('[v0] API error:', { url, status: res.status, error: data.error });
    throw new Error(data.error || `API error: ${res.status}`);
  }
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

export function useBodegaInventory(page: number = 0, pageSize: number = 50, search: string = '', category: string = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    search,
    category
  });
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/bodega/inventory?${params}`, 
    fetcher
  );
  
  return {
    inventory: (data?.inventory || []) as InventoryItem[],
    pagination: data?.pagination || { page: 0, pageSize: 50, total: 0, totalPages: 0 },
    error,
    isLoading,
    mutate
  };
}

export interface BodegaCategory {
  label: string;
  color: string;
  count: number;
  total_stock: number;
  low_stock: number;
}

export function useBodegaCategories() {
  const { data, error, isLoading } = useSWR('/api/bodega/categories', fetcher);
  const categories = useMemo(() => {
    const raw = Array.isArray(data?.categories) ? (data.categories as BodegaCategory[]) : [];
    const grouped = new Map<string, BodegaCategory>();

    for (const category of raw) {
      const key = normalizeText(category.label);
      const current = grouped.get(key);
      if (current) {
        grouped.set(key, {
          ...current,
          count: (current.count || 0) + (category.count || 0),
          total_stock: (current.total_stock || 0) + (category.total_stock || 0),
          low_stock: (current.low_stock || 0) + (category.low_stock || 0),
        });
        continue;
      }

      grouped.set(key, {
        ...category,
        label: formatCategoryLabel(category.label),
      });
    }

    return Array.from(grouped.values());
  }, [data]);
  return {
    categories,
    error,
    isLoading,
  };
}

export function useFinanzasMovements() {
  const { data, error, isLoading, mutate } = useSWR('/api/finanzas/movements', fetcher);
  return { movements: (data?.movements || []) as Movement[], error, isLoading, mutate };
}

export function useHSEMetrics() {
  const { data, error, isLoading, mutate } = useSWR('/api/hse/metrics', fetcher);
  return { metrics: (data?.metrics || []) as Metric[], error, isLoading, mutate };
}

