type SupabaseLike = {
  from: (table: string) => any;
};

export type RoleKpiChangeItem = {
  label: string;
  current: number;
  previous: number;
  unit: string;
};

export type RoleKpiChange = {
  available: boolean;
  note: string;
  items: RoleKpiChangeItem[];
};

type Options = {
  supabase: SupabaseLike;
  organizationId: string;
  sourceView: string;
  cargoName: string;
  kpiKeys?: string[];
  maxItems?: number;
};

export async function getRoleKpiChange({
  supabase,
  organizationId,
  sourceView,
  cargoName,
  kpiKeys,
  maxItems = 4,
}: Options): Promise<RoleKpiChange> {
  let query = supabase
    .from('role_kpi_snapshot_history')
    .select('snapshot_date,kpi_key,label,unit,measured_value')
    .eq('organization_id', organizationId)
    .eq('source_view', sourceView)
    .eq('cargo_name', cargoName)
    .order('snapshot_date', { ascending: false })
    .limit(250);

  if (kpiKeys?.length) query = query.in('kpi_key', kpiKeys);

  const { data, error } = await query;
  if (error) {
    console.error('[role-kpi-change]', sourceView, cargoName, error.message);
    return {
      available: false,
      note: 'No fue posible leer el historial comparable de este portal.',
      items: [],
    };
  }

  const rows = data || [];
  const dates = Array.from(new Set(rows.map((row: any) => String(row.snapshot_date)))).slice(0, 2);
  if (dates.length < 2) {
    return {
      available: false,
      note: 'Aún existe un solo corte histórico. La comparación se activará automáticamente cuando se capture el siguiente corte diario.',
      items: [],
    };
  }

  const [currentDate, previousDate] = dates;
  const currentRows = rows.filter((row: any) => String(row.snapshot_date) === currentDate);
  const previousRows = rows.filter((row: any) => String(row.snapshot_date) === previousDate);
  const previousByKey = new Map(previousRows.map((row: any) => [row.kpi_key, row]));

  const items: RoleKpiChangeItem[] = [];
  for (const row of currentRows) {
    const previous: any = previousByKey.get(row.kpi_key);
    if (!previous) continue;
    if (row.measured_value === null || row.measured_value === undefined) continue;
    if (previous.measured_value === null || previous.measured_value === undefined) continue;

    const currentValue = Number(row.measured_value);
    const previousValue = Number(previous.measured_value);
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) continue;

    items.push({
      label: row.label || row.kpi_key,
      current: currentValue,
      previous: previousValue,
      unit: row.unit || '',
    });
    if (items.length >= maxItems) break;
  }

  return {
    available: items.length > 0,
    note: items.length
      ? `Comparación del corte ${currentDate} contra ${previousDate}.`
      : 'Existen dos cortes, pero no hay KPI numéricos equivalentes y completos para compararlos.',
    items,
  };
}
