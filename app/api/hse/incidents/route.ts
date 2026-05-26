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

    const severity = request.nextUrl.searchParams.get('severity');
    const status = request.nextUrl.searchParams.get('status');
    
    let queryParams = 'select=*';
    if (severity) queryParams += `&severity=eq.${severity}`;
    if (status) queryParams += `&status=eq.${status}`;

    const response = await fetch(
      `${url}/rest/v1/incidents?${queryParams}&order=date_reported.desc`,
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
