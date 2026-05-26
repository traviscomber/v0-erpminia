import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Mock data for now - can be enhanced with database queries
    const stats = {
      averageMTTR: 18.5,
      totalDowntime30d: 12,
      availability: 98.5,
      completedWorkOrders: 23,
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
