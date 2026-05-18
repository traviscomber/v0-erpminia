import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { CorrectiveActionService } from '@/lib/services/corrective-action.service';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'read' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const ca = await CorrectiveActionService.getCorrectiveAction(params.id);
    return NextResponse.json(ca);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch corrective action' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'write' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const ca = await CorrectiveActionService.updateCorrectiveAction(params.id, body);
    return NextResponse.json(ca);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update corrective action' }, { status: 500 });
  }
}
