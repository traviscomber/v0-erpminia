import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const calculateDaysUntil = (dateString: string) => {
      const dueDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      const timeDiff = dueDate.getTime() - today.getTime();
      return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    };

    const date7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const date14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const schedules = [
      {
        id: '1',
        taskName: 'Revisión de alineación - SAG',
        assetName: 'Molino SAG',
        nextScheduledDate: date7days,
        priority: 'high' as const,
        daysUntil: calculateDaysUntil(date7days),
      },
      {
        id: '2',
        taskName: 'Cambio de neumáticos - Bolas',
        assetName: 'Molino Bolas',
        nextScheduledDate: date14days,
        priority: 'medium' as const,
        daysUntil: calculateDaysUntil(date14days),
      },
      {
        id: '3',
        taskName: 'Inspección de rodamientos',
        assetName: 'Bomba Principal',
        nextScheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high' as const,
        daysUntil: 3,
      },
    ];

    return NextResponse.json({ schedules });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
