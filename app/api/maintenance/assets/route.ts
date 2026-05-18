import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { AssetTrackingService } from '@/lib/services/asset-tracking.service';
import { AuditTrailService } from '@/lib/services/audittrail.service';

export async function POST(request: NextRequest) {
  const auth = await rbacMiddleware(request, {
    requiredPermissions: [{ resource: 'maintenance', action: 'create' }],
  });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const asset = await AssetTrackingService.registerAsset({
      organizationId: auth.organizationId!,
      assetCode: body.assetCode,
      assetName: body.assetName,
      assetType: body.assetType,
      location: body.location,
      acquisitionDate: new Date(body.acquisitionDate),
      acquisitionCost: body.acquisitionCost,
      criticality: body.criticality,
    });

    await AuditTrailService.logAction({
      organizationId: auth.organizationId!,
      userId: auth.userId!,
      action: 'create',
      resourceType: 'asset',
      resourceId: asset.id,
      newValues: body,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to register asset' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, {
    requiredPermissions: [{ resource: 'maintenance', action: 'read' }],
  });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const criticality = searchParams.get('criticality');

    const assets = await AssetTrackingService.listAssets(auth.organizationId!, {
      criticality: criticality || undefined,
    });

    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}
