import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 });
    }
    if (!supabaseKey) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let table: string;
    if (tipo === 'externas') {
      table = 'inspecciones_externas';
    } else if (tipo === 'hse') {
      table = 'hse_inspections';
    } else {
      table = 'inspecciones_internas';
    }

    let query = `select=*`;
    if (estado) {
      query += `&estado=eq.${encodeURIComponent(estado)}`;
    }
    query += `&limit=${limit}&offset=${offset}`;

    const url = `${supabaseUrl}/rest/v1/${table}?${query}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Supabase ${response.status}: ${text}` }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({
      data: Array.isArray(data) ? data : [],
      pagination: { total: data.length || 0, limit, offset },
    });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
    }

    const body = await request.json();
    const { tipo, ...data } = body;

    let table;
    if (tipo === 'externas') {
      table = 'inspecciones_externas';
    } else if (tipo === 'hse') {
      table = 'hse_inspections';
    } else {
      table = 'inspecciones_internas';
    }

    const url = `${supabaseUrl}/rest/v1/${table}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([data]),
    });

    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result[0] || result, { status: 201 });
  } catch (error) {
    console.error('Error creating inspección:', error);
    return NextResponse.json({ error: 'Failed to create inspección' }, { status: 500 });
  }
}
