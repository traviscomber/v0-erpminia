export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAccess, MODULE_KEYS } from '@/lib/api/module-access';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.HSE_INCIDENTE, false);
  if (!access.authorized) return access.response;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ data: [], count: 0, warning: 'Missing config' });
    }

    const severity = request.nextUrl.searchParams.get('severity');
    const status = request.nextUrl.searchParams.get('status');
    
    let queryParams = 'select=*';
    if (severity) queryParams += `&severity=eq.${severity}`;
    if (status) queryParams += `&status=eq.${status}`;

    const response = await fetch(
      `${url}/rest/v1/incidents${queryParams}&order=date_reported.desc`,
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
      return NextResponse.json({ data: [], count: 0, warning: text });
    }

    const data = await response.json();
    return NextResponse.json({ data: data || [], count: data?.length || 0 });
  } catch (error) {
    return NextResponse.json({ data: [], count: 0, warning: String(error) });
  }
}
