import { NextRequest, NextResponse } from 'next/server';
import { NonconformanceService } from '@/lib/services/nonconformance.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || 'default';
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    const ncs = await NonconformanceService.listNonconformances(orgId, {
      status: status || undefined,
      severity: severity || undefined,
    });

    return NextResponse.json({ data: ncs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nc = await NonconformanceService.createNonconformance(body.organizationId, body);
    return NextResponse.json({ data: nc }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const nc = await NonconformanceService.updateNonconformance(body.ncId, body.updates);
    return NextResponse.json({ data: nc });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
