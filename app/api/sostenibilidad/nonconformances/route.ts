import { NextRequest, NextResponse } from 'next/server';
import { getMockNonconformanceData } from '@/lib/mock-data/production-data';

/**
 * Non-conformances API
 * Returns nonconformance and corrective action data
 * TODO: Replace with real Supabase queries
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId') || 'default-org';
    
    // Mock data - TODO: Replace with real API call to Supabase
    const mockData = getMockNonconformanceData();
    
    return NextResponse.json(mockData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching nonconformance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nonconformance data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock response - TODO: Implement real POST logic with Supabase
    return NextResponse.json(
      {
        success: true,
        message: 'Nonconformance created successfully',
        id: `nc-${Date.now()}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating nonconformance:', error);
    return NextResponse.json(
      { error: 'Failed to create nonconformance' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock response - TODO: Implement real PUT logic with Supabase
    return NextResponse.json(
      {
        success: true,
        message: 'Nonconformance updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Error updating nonconformance:', error);
    return NextResponse.json(
      { error: 'Failed to update nonconformance' },
      { status: 500 }
    );
  }
}

