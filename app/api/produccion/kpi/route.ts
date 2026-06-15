import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('produccion_kpi')
    .select('*')
    .order('date', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kpis: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { date, production_tons, equipment_uptime, safety_incidents, environmental_compliance, workforce_efficiency } = body;

  const { data, error } = await supabase
    .from('produccion_kpi')
    .insert({
      date: date || new Date().toISOString().split('T')[0],
      production_tons,
      equipment_uptime,
      safety_incidents,
      environmental_compliance,
      workforce_efficiency,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kpi: data }, { status: 201 });
}
