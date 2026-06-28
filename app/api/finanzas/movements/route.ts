export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const CANDIDATE_TABLES = ['finance_movements', 'finanzas_movements', 'movements'];

async function readMovements(context: Awaited<ReturnType<typeof getOrganizationContext>>) {
  for (const table of CANDIDATE_TABLES) {
    const { data, error } = await context.supabase
      .from(table)
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('date', { ascending: false })
      .limit(500);

    if (!error) return { table, data: data || [] };
  }

  return { table: null, data: [] as any[] };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data } = await readMovements(context);
    return NextResponse.json({ movements: data || [] });
  } catch (error) {
    return NextResponse.json({ movements: [], error: (error as Error).message }, { status: 500 });
  }
}
