import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Finanzas Module - Budget, Costs, Financial Reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get contracts (budget items)
    const { data: contracts, error: cError } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    // Get procurement documents (expenses)
    const { data: expenses, error: eError } = await supabase
      .from('procurement_documents')
      .select('amount')
      .order('issue_date', { ascending: false });

    if (cError || eError) throw cError || eError;

    const totalBudget = contracts?.reduce((sum: number, c: any) => sum + (c.contract_value || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

    return NextResponse.json({ 
      contracts: contracts || [],
      expenses: expenses || [],
      total_budget: totalBudget,
      total_expenses: totalExpenses,
      balance: totalBudget - totalExpenses,
    });
  } catch (err) {
    console.error('[v0] GET /api/dashboard/finanzas error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
