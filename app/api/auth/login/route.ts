import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Demo account
    if (email === 'admin@example.com') {
      const response = NextResponse.json({ success: true });
      response.cookies.set('demo_auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400,
      });
      return response;
    }

    return NextResponse.json({ error: 'Invalid email' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
