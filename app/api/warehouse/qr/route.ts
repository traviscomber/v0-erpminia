import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { QRScannerService } from '@/lib/services/qr-scanner.service';

export async function POST(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'warehouse', action: 'write' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'generate') {
      const qr = await QRScannerService.generateQRCode(auth.organizationId!, body.stockId, body.binId);
      return NextResponse.json(qr, { status: 201 });
    } else if (action === 'scan') {
      const result = await QRScannerService.scanQRCode(body.qrCodeValue, body.scanAction, auth.user.id, body.binId);
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'QR operation failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'warehouse', action: 'read' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const qrValue = searchParams.get('value');
    if (!qrValue) return NextResponse.json({ error: 'QR value required' }, { status: 400 });
    
    const data = await QRScannerService.getQRCodeData(qrValue);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch QR data' }, { status: 500 });
  }
}
