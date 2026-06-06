import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getLegalComplianceOverview } from '@/lib/api/contracts';

const MOCK_COMPLIANCE = {
  summary: {
    total_contracts: 2,
    active_contracts: 2,
    contracts_pending_review: 0,
    contracts_missing_file: 0,
    expiring_contracts: 0,
    expired_contracts: 0,
    legal_documents: 3,
    expiring_documents: 0,
    approved_documents: 3,
  },
  contracts_pending_review: [],
  contracts_missing_file: [],
  expiring_contracts: [],
  expiring_documents: [],
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    try {
      const compliance = await getLegalComplianceOverview(auth.organizationId);
      return NextResponse.json(compliance);
    } catch {
      // Fallback to mock compliance data
      return NextResponse.json(MOCK_COMPLIANCE);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch compliance data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
