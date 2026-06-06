import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listContractsForOrganization } from '@/lib/api/contracts';

const MOCK_CONTRACTS = [
  { 
    id: '1', 
    title: 'Contrato Proveedor - Equipos Mineros', 
    contractor_name: 'TechMin Solutions',
    status: 'active',
    start_date: '2024-01-15',
    end_date: '2026-01-15',
    contract_value: 50000,
    currency: 'USD',
    compliance_status: 'compliant'
  },
  { 
    id: '2', 
    title: 'Contrato Servicios de Mantenimiento', 
    contractor_name: 'MaintenancePro LLC',
    status: 'active',
    start_date: '2024-03-01',
    end_date: '2025-03-01',
    contract_value: 120000,
    currency: 'USD',
    compliance_status: 'compliant'
  },
];

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const search = new URL(request.url).searchParams.get('search');
    try {
      const result = await listContractsForOrganization(auth.organizationId, search);
      return NextResponse.json(result);
    } catch {
      // Fallback to mock data
      const contracts = search 
        ? MOCK_CONTRACTS.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
        : MOCK_CONTRACTS;
      return NextResponse.json({ contracts, total: contracts.length });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch legal contracts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const newContract = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      status: 'pending',
      compliance_status: 'pending_review',
    };
    return NextResponse.json(newContract, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create contract';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
