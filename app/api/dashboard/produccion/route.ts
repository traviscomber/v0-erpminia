import { NextRequest, NextResponse } from 'next/server';
import { getMockProductionData } from '@/lib/mock-data/production-data';

/**
 * Production Data API
 * Returns production telemetry data
 * Uses mock data when no real data is available
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with real API call to Supabase
    // For now, return mock data
    const mockData = getMockProductionData();
    
    return NextResponse.json(mockData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching production data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production data' },
      { status: 500 }
    );
  }
}
