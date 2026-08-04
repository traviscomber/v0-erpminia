export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

function clearCookie(response: NextResponse, name: string, httpOnly: boolean) {
  response.cookies.set(name, '', {
    httpOnly,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function POST() {
  const response = NextResponse.json({
    success: true,
    redirectTo: '/auth/login',
  });

  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');

  clearCookie(response, 'auth_token', true);
  clearCookie(response, 'user_role', false);
  clearCookie(response, 'user_email', false);

  return response;
}
