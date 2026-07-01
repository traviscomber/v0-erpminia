export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

type MaintenancePartRow = {
  quantity_consumed?: number | null;
  sku?: {
    unit_cost?: number | null;
  } | Array<{
    unit_cost?: number | null;
  }> | null;
};

type CompletedOrderRow = {
  created_at: string;
  completed_at: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const otId = searchParams.get('otId');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!otId) {
    return NextResponse.json({
      mttr: null,
      labor_hours: 0,
      parts_cost: 0,
      total_cost: 0,
    });
  }

  const { data: ot, error: otError } = await supabase
    .from('mantenimiento_ordenes')
    .select('created_at, due_date, completed_at')
    .eq('id', otId)
    .single();

  if (otError) {
    return NextResponse.json({
      mttr: null,
      labor_hours: 0,
      parts_cost: 0,
      total_cost: 0,
      warning: otError.message,
    });
  }

  let mttr = null;
  if (ot?.created_at && ot?.completed_at) {
    const createdTime = new Date(ot.created_at).getTime();
    const completedTime = new Date(ot.completed_at).getTime();
    mttr = (completedTime - createdTime) / (1000 * 60 * 60);
  }

  const { data: timeEntries, error: timeError } = await supabase
    .from('mantenimiento_tiempo')
    .select('horas_trabajadas')
    .eq('ot_id', otId);

  if (timeError) {
    return NextResponse.json({
      mttr,
      labor_hours: 0,
      parts_cost: 0,
      total_cost: 0,
      warning: timeError.message,
    });
  }

  const totalHoras = timeEntries?.reduce((sum, entry) => sum + entry.horas_trabajadas, 0) || 0;

  const { data: parts, error: partsError } = await supabase
    .from('mantenimiento_partes')
    .select('quantity_consumed, sku(*)')
    .eq('ot_id', otId);

  if (partsError) {
    return NextResponse.json({
      mttr,
      labor_hours: totalHoras,
      parts_cost: 0,
      total_cost: totalHoras * 50,
      warning: partsError.message,
    });
  }

  let totalCostoPiezas = 0;
  if (parts && Array.isArray(parts)) {
    parts.forEach((part: MaintenancePartRow) => {
      const unitCost = Array.isArray(part.sku) ? part.sku[0]?.unit_cost || 0 : part.sku?.unit_cost || 0;
      totalCostoPiezas += (part.quantity_consumed || 0) * unitCost;
    });
  }

  return NextResponse.json({
    mttr,
    labor_hours: totalHoras,
    parts_cost: totalCostoPiezas,
    total_cost: totalCostoPiezas + (totalHoras * 50),
  });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

  const { data: completedOts } = await supabase
    .from('mantenimiento_ordenes')
    .select('id, created_at, completed_at')
    .eq('status', 'completado')
    .gte('completed_at', startOfMonth)
    .lte('completed_at', endOfMonth);
  const completedOrders = (completedOts || []) as CompletedOrderRow[];

  const mes = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  if (completedOrders.length === 0) {
    return NextResponse.json({
      kpi: {
        mes,
        ot_completadas: 0,
        mttr_promedio: 0,
      },
    });
  }

  const mttrValues = completedOrders.map((ot) => {
    const created = new Date(ot.created_at).getTime();
    const completed = new Date(ot.completed_at).getTime();
    return (completed - created) / (1000 * 60 * 60);
  });

  const mttrPromedio = mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length;

  const { data, error } = await supabase
    .from('mantenimiento_kpi')
    .upsert({
      mes,
      ot_completadas: completedOrders.length,
      mttr_promedio: mttrPromedio,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'mes' })
    .select();

  if (error) {
    return NextResponse.json({
      kpi: {
        mes,
        ot_completadas: completedOrders.length,
        mttr_promedio: mttrPromedio,
      },
      warning: error.message,
    });
  }

  return NextResponse.json({ kpi: data?.[0] });
}
