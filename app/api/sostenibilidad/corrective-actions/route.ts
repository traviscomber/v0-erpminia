import { NextRequest, NextResponse } from 'next/server';
import { mockCorrectiveActions } from '@/lib/mock-data/production-data';

/**
 * Corrective Actions API
 * Returns corrective action data
 * TODO: Replace with real Supabase queries
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nonconformanceId = searchParams.get('nonconformanceId');
    
    // Mock data - TODO: Replace with real API call
    let actions = mockCorrectiveActions;
    if (nonconformanceId) {
      actions = actions.filter(a => a.id.includes(nonconformanceId));
    }
    
    return NextResponse.json({ corrective_actions: actions }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching corrective actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch corrective actions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock response - TODO: Implement real POST logic
    return NextResponse.json(
      {
        success: true,
        message: 'Corrective action created successfully',
        id: `ca-${Date.now()}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating corrective action:', error);
    return NextResponse.json(
      { error: 'Failed to create corrective action' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock response - TODO: Implement real PUT logic
    return NextResponse.json(
      {
        success: true,
        message: 'Corrective action updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Error updating corrective action:', error);
    return NextResponse.json(
      { error: 'Failed to update corrective action' },
      { status: 500 }
    );
  }
}
