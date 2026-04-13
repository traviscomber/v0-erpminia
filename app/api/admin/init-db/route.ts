import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init';

export async function POST(request: NextRequest) {
  try {
    // Verify authorization - only allow from admin or during setup
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ADMIN_INIT_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await initializeDatabase();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
