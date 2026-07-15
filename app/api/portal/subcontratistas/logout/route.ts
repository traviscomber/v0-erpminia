export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SUBCONTRACTOR_SESSION_COOKIE } from '@/lib/subcontractor-session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SUBCONTRACTOR_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
