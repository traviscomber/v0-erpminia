import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const componente = searchParams.get('componente');
    const etapa = searchParams.get('etapa');
    const cumple = searchParams.get('cumple');
    const search = searchParams.get('search');

    let query = supabase
      .from('compromisos_ambientales')
      .select('*')
      .order('numero', { ascending: true });

    if (componente && componente !== 'todos') query = query.eq('componente', componente);
    if (etapa && etapa !== 'todos') query = query.eq('etapa', etapa);
    if (cumple === 'true') query = query.eq('cumple', true);
    if (cumple === 'false') query = query.eq('cumple', false);
    if (search) query = query.ilike('compromiso', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    // Stats
    const { data: stats } = await supabase
      .from('compromisos_ambientales')
      .select('componente, cumple, etapa');

    const totalCumple = stats?.filter(r => r.cumple).length ?? 0;
    const totalNoCumple = stats?.filter(r => !r.cumple).length ?? 0;
    const porComponente = stats?.reduce((acc: Record<string, number>, r) => {
      acc[r.componente] = (acc[r.componente] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      compromisos: data,
      stats: { total: stats?.length ?? 0, cumple: totalCumple, noCumple: totalNoCumple, porComponente }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      // Excel upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      const buf = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buf, { cellDates: true });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null }) as any[];

      const valid = rows.filter(r => r['NÚMERO'] != null && typeof r['NÚMERO'] === 'number');
      const records = valid.map(r => ({
        numero: r['NÚMERO'],
        etapa: r['ETAPA DEL PROYECTO']?.trim() ?? '',
        componente: r['COMPONENTE']?.trim() ?? '',
        compromiso: (r['COMPROMISOS AMBIENTALES '] ?? r['COMPROMISOS AMBIENTALES'])?.trim() ?? '',
        referencia_rca: r['Área, Sección, Título, Párrafo identificado']?.trim() ?? null,
        tipo_control: r['SEGUIMIENTO'] === 'X' && r['REGISTRO'] === 'X' ? 'ambos'
          : r['SEGUIMIENTO'] === 'X' ? 'seguimiento'
          : r['REGISTRO'] === 'X' ? 'registro'
          : null,
        registro_cumplimiento: r['REGISTRO DE CUMPLIMIENTO']?.trim() ?? null,
        cumple: r['CUMPLE'] === 'X',
        responsable: r['RESPONSABLE']?.trim() ?? null,
      }));

      // Upsert by numero
      const { error } = await supabase
        .from('compromisos_ambientales')
        .upsert(records, { onConflict: 'numero' });

      if (error) throw error;
      return NextResponse.json({ imported: records.length });
    }

    // JSON single record
    const body = await request.json();
    const { error } = await supabase.from('compromisos_ambientales').insert(body);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
      .from('compromisos_ambientales')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
