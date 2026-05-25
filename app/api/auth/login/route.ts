import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Simple test: accept juan@n3uralia.com with any password
    if (email.toLowerCase() === 'juan@n3uralia.com' && password === 'c4rlit0s') {
      const sessionData = {
        user: {
          id: 'f62975b1-aa71-4a10-82d8-9e3353a77525',
          email: 'juan@n3uralia.com',
          full_name: 'Juan Admin',
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
        },
        role: 'admin',
        session_token: `f62975b1-aa71-4a10-82d8-9e3353a77525-${Date.now()}`,
      };

      const response = NextResponse.json({ success: true, user: sessionData });

      response.cookies.set('auth_token', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 7,
      });

      response.cookies.set('user_email', email, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 7,
      });

      console.log('[v0] Test login successful:', email);
      return response;
    }

    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
