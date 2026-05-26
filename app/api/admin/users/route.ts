import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/api/guard';

// Mock in-memory database for demo
const mockUsers: Record<string, any> = {
  'admin@example.com': {
    id: '1',
    email: 'admin@example.com',
    full_name: 'Administrador',
    role: 'admin',
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
  },
};

let userCounter = 2;

// GET - Fetch all users
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = Object.values(mockUsers);
    return NextResponse.json({ users });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, password, full_name, role } = body;

    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'All fields required' },
        { status: 400 }
      );
    }

    if (mockUsers[email]) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    const newUser = {
      id: String(userCounter++),
      email,
      full_name,
      role,
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      last_sign_in_at: null,
    };

    mockUsers[email] = newUser;
    return NextResponse.json({ message: 'User created', user: newUser }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH - Update user role
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, role } = body;

    const user = Object.values(mockUsers).find((u: any) => u.id === userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.role = role;
    return NextResponse.json({ message: 'Role updated', user }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    const email = Object.keys(mockUsers).find((key) => mockUsers[key].id === userId);
    if (!email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    delete mockUsers[email];
    return NextResponse.json({ message: 'User deleted' }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
