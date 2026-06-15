import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!otId) {
    return NextResponse.json({ error: 'otId required' }, { status: 400 });
  }

  // Get OT with dates to calculate MTTR
  const { data: ot } = await supabase
    .from('mantenimiento_ordenes')
    .select('created_at, due_date, completed_at')
    .eq('id', otId)
    .single();

  // Calculate MTTR in hours
  let mttr = null;
  if (ot?.created_at && ot?.completed_at) {
    const createdTime = new Date(ot.created_at).getTime();
    const completedTime = new Date(ot.completed_at).getTime();
    mttr = (completedTime - createdTime) / (1000 * 60 * 60); // Convert to hours
  }

  // Get total labor hours
  const { data: timeEntries } = await supabase
    .from('mantenimiento_tiempo')
    .select('horas_trabajadas')
    .eq('ot_id', otId);

  const totalHoras = timeEntries?.reduce((sum, entry) => sum + entry.horas_trabajadas, 0) || 0;

  // Get parts cost
  const { data: parts } = await supabase
    .from('mantenimiento_partes')
    .select('quantity_consumed, sku(*)')
    .eq('ot_id', otId);

  let totalCostoPiezas = 0;
  if (parts && Array.isArray(parts)) {
    parts.forEach((part: any) => {
      const unitCost = part.sku?.unit_cost || 0;
      totalCostoPiezas += (part.quantity_consumed || 0) * unitCost;
    });
  }

  return NextResponse.json({
    mttr,
    labor_hours: totalHoras,
    parts_cost: totalCostoPiezas,
    total_cost: totalCostoPiezas + (totalHoras * 50), // Assuming $50/hour labor rate
  });
}

export async function POST(request: NextRequest) {
  // Recalculate MTTR KPI for the month
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

  // Get all completed OTs for the month
  const { data: completedOts } = await supabase
    .from('mantenimiento_ordenes')
    .select('id, created_at, completed_at')
    .eq('status', 'completado')
    .gte('completed_at', startOfMonth)
    .lte('completed_at', endOfMonth);

  if (!completedOts || completedOts.length === 0) {
    return NextResponse.json({ mttr_kpi: null });
  }

  // Calculate average MTTR
  const mttrValues = completedOts.map((ot) => {
    const created = new Date(ot.created_at).getTime();
    const completed = new Date(ot.completed_at).getTime();
    return (completed - created) / (1000 * 60 * 60);
  });

  const mttrPromedio = mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length;

  // Store KPI
  const mes = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const { data, error } = await supabase
    .from('mantenimiento_kpi')
    .upsert({
      mes,
      ot_completadas: completedOts.length,
      mttr_promedio: mttrPromedio,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'mes' })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kpi: data?.[0] });
}
