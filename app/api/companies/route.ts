import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ companies: [] }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
