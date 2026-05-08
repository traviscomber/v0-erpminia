import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Database initialization is handled through Supabase dashboard
    return NextResponse.json(
      { 
        message: 'Database already initialized',
        status: 'ready'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
