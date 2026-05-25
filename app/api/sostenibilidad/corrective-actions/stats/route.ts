import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ data: { total: 0, inProgress: 0, completed: 0, overdue: 0, completionRate: 0 } });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

