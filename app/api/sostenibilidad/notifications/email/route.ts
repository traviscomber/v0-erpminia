import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, type } = await request.json();

    const emailPayload = {
      to,
      subject,
      body,
      type,
      timestamp: new Date(),
      status: 'queued',
    };

    console.log('[v0] Email queued:', emailPayload);

    return NextResponse.json({
      success: true,
      message: 'Email queued for delivery',
      data: emailPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to queue email', details: String(error) },
      { status: 500 }
    );
  }
}
