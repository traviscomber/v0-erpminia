import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { StockService } from '@/lib/services/stock.service';
import { AuditTrailService } from '@/lib/services/audittrail.service';

export async function POST(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'warehouse', action: 'write' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const stock = await StockService.addStock(auth.organizationId!, body.partCode, body.quantity, body.binId, body.unitCost);
    await AuditTrailService.logAction({ organizationId: auth.organizationId!, userId: auth.user.id, action: 'create', resourceType: 'stock', resourceId: stock.id, newValues: body });
    return NextResponse.json(stock, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add stock' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'warehouse', action: 'read' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const binId = searchParams.get('binId');
    const stock = await StockService.listStockByOrganization(auth.organizationId!, { binId: binId || undefined });
    return NextResponse.json({ stock });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
