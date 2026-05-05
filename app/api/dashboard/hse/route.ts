import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// HSE Module - Incidents, Audits, SERNAGEOMIN Compliance
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type'); // 'incidents', 'inspections', 'requirements'

    if (dataType === 'incidents') {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('date_occurred', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ incidents: data || [] });
    }

    if (dataType === 'inspections') {
      const { data, error } = await supabase
        .from('hse_inspections')
        .select('*')
        .order('inspection_date', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ inspections: data || [] });
    }

    if (dataType === 'requirements') {
      const { data, error } = await supabase
        .from('normative_requirements')
        .select('*, framework_id(*)')
        .eq('compliance_type', 'SERNAGEOMIN');

      if (error) throw error;
      return NextResponse.json({ requirements: data || [] });
    }

    // Default: return all
    const [incidents, inspections, requirements] = await Promise.all([
      supabase.from('incidents').select('*').order('date_occurred', { ascending: false }),
      supabase.from('hse_inspections').select('*').limit(5),
      supabase.from('normative_requirements').select('*').eq('status', 'pending').limit(5),
    ]);

    return NextResponse.json({
      incidents: incidents.data || [],
      inspections: inspections.data || [],
      requirements: requirements.data || [],
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/hse error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { type, ...data } = body; // type: 'incident', 'inspection', 'requirement'

    let table = 'incidents';
    if (type === 'inspection') table = 'hse_inspections';
    if (type === 'requirement') table = 'normative_requirements';

    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select();

    if (error) {
      console.error(`[v0] Error creating ${type}:`, error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ record: result?.[0] }, { status: 201 });
  } catch (err) {
    console.error('[v0] POST /api/dashboard/hse error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
