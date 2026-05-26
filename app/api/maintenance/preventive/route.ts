import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const schedules = [
      {
        id: 1,
        asset: 'Molino SAG',
        maintenance_type: 'preventiva',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        id: 2,
        asset: 'Molino Bolas',
        maintenance_type: 'correctiva',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];

    return NextResponse.json({ schedules });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
