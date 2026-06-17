export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    const type = request.nextUrl.searchParams.get('tipo') || 'plants';
    const tables: Record<string, string> = {
      plants: 'plants',
      equipment: 'equipment',
      sensors: 'sensors',
    };

    const table = tables[type] || 'plants';
    const select = type === 'plants' ? '*' : 
                   type === 'equipment' ? '*' : 
                   '*';

    const response = await fetch(
      `${url}/rest/v1/${table}?select=${select}`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
