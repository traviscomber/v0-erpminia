import { NextRequest, NextResponse } from 'next/server';

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
export async function GET() {
  try {
    const users = Object.values(mockUsers);
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, role } = body;

    // Validations
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (mockUsers[email]) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 409 }
      );
    }

    // Create user
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

    return NextResponse.json(
      { 
        message: 'Usuario creado exitosamente',
        user: newUser 
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}

// PATCH - Update user role
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role } = body;

    // Find user by id
    const user = Object.values(mockUsers).find((u: any) => u.id === userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Update role
    user.role = role;

    return NextResponse.json(
      { 
        message: 'Rol actualizado exitosamente',
        user 
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    // Find user by id
    const email = Object.keys(mockUsers).find(
      (key) => mockUsers[key].id === userId
    );

    if (!email) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Delete user
    delete mockUsers[email];

    return NextResponse.json(
      { message: 'Usuario eliminado exitosamente' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
