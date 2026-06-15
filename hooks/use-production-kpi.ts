import useSWR from 'swr';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'API error');
  return data;
};

export function useProductionKPI() {
  const { data, error, isLoading, mutate } = useSWR('/api/produccion/kpi', fetcher);

  return {
    kpis: data?.kpis || [],
    isLoading,
    error,
    mutate,
  };
}
