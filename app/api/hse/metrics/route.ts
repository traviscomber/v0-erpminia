export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);

  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('hse_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ metrics: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);

  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { date, lost_time_injuries, near_misses, environmental_incidents, training_hours, employees_trained, audit_score } = body;

  const { data, error } = await supabase
    .from('hse_metrics')
    .insert({
      date: date || new Date().toISOString().split('T')[0],
      lost_time_injuries,
      near_misses,
      environmental_incidents,
      training_hours,
      employees_trained,
      audit_score,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ metric: data }, { status: 201 });
}
