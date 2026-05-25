import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ data: [] });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({ data: {} }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    return NextResponse.json({ data: {} });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
