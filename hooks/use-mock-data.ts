'use client';

import useSWR from 'swr';

/**
 * Shared SWR hooks for MVP modules.
 * Sustainability hooks now prefer real API payloads and only expose empty states.
 */

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
};

/**
 * Hook para datos de produccion.
 * Este modulo ya consume datos reales y no usa fallback mock.
 */
export function useProductionData() {
  const { data, error, isLoading, mutate } = useSWR('/api/dashboard/produccion', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
  });

  return {
    data,
    error,
    isLoading,
    mutate,
    isMock: false,
  };
}

/**
 * Hook para datos de no conformidades.
 */
export function useNonconformanceData(organizationId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    organizationId ? `/api/sostenibilidad/nonconformances?organizationId=${organizationId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
    }
  );

  return {
    data:
      data || {
        nonconformances: [],
        corrective_actions: [],
        inspections: [],
        compliance_stats: {
          total: 0,
          open: 0,
          in_progress: 0,
          closed: 0,
          overdue: 0,
        },
      },
    error,
    isLoading: isLoading && !data,
    mutate,
    isMock: false,
  };
}

/**
 * Hook para datos del dashboard.
 */
export function useDashboardData() {
  const { data, error, isLoading } = useSWR('/api/sostenibilidad/dashboard/overview', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 60000,
  });

  return {
    data:
      data || {
        period: '',
        overview: {
          compliance_score: 0,
          total_ncs: 0,
          open_ncs: 0,
          closed_ncs: 0,
          overdue_cas: 0,
          trend: 'stable',
        },
        nc_stats: { critical: 0, high: 0, medium: 0, low: 0 },
        ca_stats: { total: 0, planned: 0, in_progress: 0, completed: 0, overdue: 0, completionRate: 0 },
        trends: [],
        top_risks: [],
        inspections_completed: 0,
        generated_at: '',
      },
    error,
    isLoading: isLoading && !data,
    isMock: false,
  };
}

/**
 * Hook para inspecciones.
 */
export function useInspections(tipo?: string) {
  const query = tipo ? `?tipo=${tipo}` : '';
  const { data, error, isLoading, mutate } = useSWR(`/api/sostenibilidad/inspecciones${query}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    data: data?.data || [],
    error,
    isLoading,
    mutate,
    isMock: data?.mock || false,
  };
}

/**
 * Hook para acciones correctivas.
 */
export function useCorrectiveActions(nonconformanceId?: string) {
  const query = nonconformanceId ? `?nonconformanceId=${nonconformanceId}` : '';
  const { data, error, isLoading, mutate } = useSWR(`/api/sostenibilidad/corrective-actions${query}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    data: data?.corrective_actions || [],
    error,
    isLoading,
    mutate,
    isMock: false,
  };
}
