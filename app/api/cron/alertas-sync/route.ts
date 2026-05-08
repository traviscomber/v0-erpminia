import { NextRequest, NextResponse } from 'next/server';
import { ejecutarVerificacionesAlertas } from '@/lib/alerts-automation';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ejecutarVerificacionesAlertas();

    return NextResponse.json({
      success: true,
      message: 'Alert generation cycle completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v0] Cron error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
