import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing config' }, { status: 500 });
  }

  const email = 'juan@n3uralia.com';
  const url = `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`;
  
  console.log('[v0] Testing URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  const responseText = await response.text();

  return NextResponse.json({
    status: response.status,
    ok: response.ok,
    length: Array.isArray(data) ? data.length : 'not array',
    data: Array.isArray(data) ? data.slice(0, 1) : data,
    responseText: responseText.slice(0, 200),
  });
}
