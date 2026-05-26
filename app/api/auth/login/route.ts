import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Hardcoded user for now - this is the test user in Supabase
    // TODO: Replace with actual Supabase query once schema cache issue is fixed
    if (email.toLowerCase() === 'juan@n3uralia.com') {
      // Hash: $2b$10$5dC5lGiidsxTi2tIYk4mVuQrX8UD6Pb1574Q8bLkPQR6wT21ziu7e (password: c4rlit0s)
      const correctHash = '$2b$10$5dC5lGiidsxTi2tIYk4mVuQrX8UD6Pb1574Q8bLkPQR6wT21ziu7e';
      
      const passwordMatch = await bcrypt.compare(password, correctHash);
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      }

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

      console.log('[v0] Login successful:', email);
      return response;
    }

    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  } catch (error) {
    console.error('[v0] Login error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
