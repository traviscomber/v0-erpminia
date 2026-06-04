import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { listContractsForOrganization } from '@/lib/api/contracts';

type FinanceStatus = 'Pagada' | 'Pendiente' | 'Vencida';

function safeDate(value?: string | null) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function monthLabel(dateValue?: string | null) {
  return new Date(dateValue || Date.now()).toLocaleDateString('es-CL', {
    month: 'short',
  });
}

function resolveFinanceStatus(contract: any): FinanceStatus {
  const contractValue = Number(contract.contract_value || 0);
  const paidAmount = Number(contract.paid_amount || 0);
  const pendingAmount = Math.max(contractValue - paidAmount, 0);
  const dueDate = contract.review_due_date || contract.end_date || contract.created_at;
  const dueTime = new Date(dueDate || Date.now()).getTime();

  if (pendingAmount <= 0 && contractValue > 0) return 'Pagada';
  if (dueTime < Date.now()) return 'Vencida';
  return 'Pendiente';
}

async function getBudgetData(supabase: any, organizationId: string) {
  const { data, error } = await supabase
    .from('cost_centers')
    .select('name, code, budget_annual, budget_used')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) throw error;

  const rows = (data || []).map((item: any) => ({
    name: item.name || item.code || 'Sin centro de costo',
    budget: Number(item.budget_annual || 0),
    actual: Number(item.budget_used || 0),
  }));

  return {
    budget: {
      annual: rows.reduce((sum: number, item: any) => sum + item.budget, 0),
      used: rows.reduce((sum: number, item: any) => sum + item.actual, 0),
    },
    budgetVsActual: rows,
    departmentSpend: rows.map((item) => ({
      department: item.name,
      amount: item.actual,
    })),
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const period = request.nextUrl.searchParams.get('period') || 'monthly';
    const { contracts } = await listContractsForOrganization(context.organizationId);

    const expenses = contracts
      .map((contract) => {
        const amount = Number(contract.contract_value || 0);
        const paidAmount = Number(contract.paid_amount || 0);
        const dueDate = contract.review_due_date || contract.end_date || contract.created_at;
        const status = resolveFinanceStatus(contract);

        return {
          id: contract.contract_number || contract.id,
          vendor: contract.contractor_name || contract.responsible_person || 'Sin proveedor',
          amount,
          paidAmount,
          pendingAmount: Math.max(amount - paidAmount, 0),
          status,
          dueDate: safeDate(dueDate),
          paidDate: status === 'Pagada' ? safeDate(contract.updated_at || contract.created_at) : null,
          type: contract.contract_type || 'Contrato',
          title: contract.title,
        };
      })
      .sort(
        (left, right) =>
          new Date(right.dueDate).getTime() - new Date(left.dueDate).getTime()
      );

    const forecastMap = new Map<
      string,
      { period: string; projected: number; paid: number; pending: number }
    >();

    for (const expense of expenses) {
      const key = monthLabel(expense.dueDate);
      const existing = forecastMap.get(key) || {
        period: key,
        projected: 0,
        paid: 0,
        pending: 0,
      };
      existing.projected += Number(expense.amount || 0);
      existing.paid += Number(expense.paidAmount || 0);
      existing.pending += Number(expense.pendingAmount || 0);
      forecastMap.set(key, existing);
    }

    let budget = { annual: 0, used: 0 };
    let budgetVsActual: Array<{ name: string; budget: number; actual: number }> = [];
    let departmentSpend: Array<{ department: string; amount: number }> = [];

    try {
      const budgetPayload = await getBudgetData(context.supabase, context.organizationId);
      budget = budgetPayload.budget;
      budgetVsActual = budgetPayload.budgetVsActual;
      departmentSpend = budgetPayload.departmentSpend;
    } catch {
      // Keep the dashboard usable even when cost center setup is still pending.
    }

    return NextResponse.json({
      period,
      budget,
      expenses,
      budgetVsActual,
      departmentSpend,
      forecast: Array.from(forecastMap.values()),
      summary: {
        totalInvoices: expenses.length,
        paid: expenses.filter((expense) => expense.status === 'Pagada').length,
        pending: expenses.filter((expense) => expense.status === 'Pendiente').length,
        overdue: expenses.filter((expense) => expense.status === 'Vencida').length,
        totalAmount: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        totalPending: expenses.reduce(
          (sum, expense) => sum + Number(expense.pendingAmount || 0),
          0
        ),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch finance data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
