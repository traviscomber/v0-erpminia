import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
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

    let queryParams = `select=*&limit=${limit}&offset=${offset}`;
    if (estado) {
      queryParams += `&estado=eq.${encodeURIComponent(estado)}`;
    }

    const response = await fetch(`${url}/rest/v1/${table}?${queryParams}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await response.json();
    const total = parseInt(response.headers.get('content-range')?.split('/')[1] || String(data?.length || 0));

    return NextResponse.json({
      data: data || [],
      pagination: { total, limit, offset },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
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

    const response = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
