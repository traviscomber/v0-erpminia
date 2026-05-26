import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const assets = [
      {
        id: 1,
        asset_name: 'Molino SAG',
        status: 'operativo',
        criticality: 'critical',
        uptime: 99.2,
      },
      {
        id: 2,
        asset_name: 'Molino Bolas 1',
        status: 'operativo',
        criticality: 'critical',
        uptime: 98.8,
      },
    ];

    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
