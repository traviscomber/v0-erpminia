/**
 * Hook for fetching data with mock fallback
 * Automatically falls back to mock data when API is unavailable
 */

'use client';

import useSWR from 'swr';
import { 
  getMockProductionData,
  getMockNonconformanceData,
  getMockDashboardData,
} from '@/lib/mock-data/production-data';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
};

/**
 * Hook para datos de producción
 * Returns: { data, error, isLoading, mutate }
 * - Automatically provides mock data if API fails
 */
export function useProductionData() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/produccion',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 30 seconds
      onError: () => {
        // Silently fall back to mock - component will show demo badge
      },
    }
  );

  return {
    data: data || getMockProductionData(),
    error,
    isLoading: isLoading && !data,
    mutate,
    isMock: !data && !error,
  };
}

/**
 * Hook para datos de no conformidades
 * Returns: { data, error, isLoading, mutate }
 */
export function useNonconformanceData(organizationId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    organizationId ? `/api/sostenibilidad/nonconformances?organizationId=${organizationId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0, // No auto-refresh unless explicitly called
    }
  );

  return {
    data: data || getMockNonconformanceData(),
    error,
    isLoading: isLoading && !data,
    mutate,
    isMock: !data && !error,
  };
}

/**
 * Hook para datos del dashboard
 * Returns: { data, error, isLoading }
 */
export function useDashboardData() {
  const { data, error, isLoading } = useSWR(
    '/api/dashboard',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // 60 seconds
    }
  );

  return {
    data: data || getMockDashboardData(),
    error,
    isLoading: isLoading && !data,
    isMock: !data && !error,
  };
}

/**
 * Hook para inspecciones
 */
export function useInspections(tipo?: string) {
  const query = tipo ? `?tipo=${tipo}` : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/sostenibilidad/inspecciones${query}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data?.data || [],
    error,
    isLoading,
    mutate,
    isMock: data?.mock || false,
  };
}

/**
 * Hook para acciones correctivas
 */
export function useCorrectiveActions(nonconformanceId?: string) {
  const query = nonconformanceId ? `?nonconformanceId=${nonconformanceId}` : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/sostenibilidad/corrective-actions${query}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data?.corrective_actions || [],
    error,
    isLoading,
    mutate,
    isMock: false,
  };
}
