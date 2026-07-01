export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
}

type ExpenseRow = {
  created_at?: string | null;
  date?: string | null;
  expense_date?: string | null;
  due_date?: string | null;
  amount?: number | string | null;
  total_amount?: number | string | null;
  value?: number | string | null;
  cost?: number | string | null;
  department?: string | null;
  cost_center?: string | null;
  category?: string | null;
  vendor?: string | null;
  vendor_name?: string | null;
};

type NormalizedExpenseRow = ExpenseRow & { amount: number };

function getExpenseDate(expense: ExpenseRow) {
  return (
    normalizeDate(expense.created_at) ||
    normalizeDate(expense.date) ||
    normalizeDate(expense.expense_date) ||
    normalizeDate(expense.due_date) ||
    new Date()
  );
}

function getExpenseAmount(expense: ExpenseRow) {
  return toNumber(expense.amount || expense.total_amount || expense.value || expense.cost);
}

function getExpenseGroup(expense: ExpenseRow) {
  return (
    expense.department ||
    expense.cost_center ||
    expense.category ||
    expense.vendor ||
    expense.vendor_name ||
    'General'
  );
}

function buildBudgetSeries(expenses: NormalizedExpenseRow[], budgetTotal: number) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const monthlyTotals = new Map<string, number>();
  for (const expense of expenses) {
    const date = getExpenseDate(expense);
    const key = monthKey(date);
    monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + getExpenseAmount(expense));
  }

  const monthlyBudget = budgetTotal > 0 ? budgetTotal / months.length : 0;
  return months.map((date) => {
    const key = monthKey(date);
    return {
      month: monthLabel(date),
      budget: Number(monthlyBudget.toFixed(0)),
      actual: Number((monthlyTotals.get(key) || 0).toFixed(0)),
    };
  });
}

function buildForecast(expenses: NormalizedExpenseRow[]) {
  const monthlyTotals = new Map<string, number>();

  for (const expense of expenses) {
    const date = getExpenseDate(expense);
    const key = monthKey(date);
    monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + getExpenseAmount(expense));
  }

  const sortedKeys = Array.from(monthlyTotals.keys()).sort();
  const lastThree = sortedKeys.slice(-3).map((key) => monthlyTotals.get(key) || 0);
  const baseline =
    lastThree.length > 0 ? lastThree.reduce((sum, value) => sum + value, 0) / lastThree.length : 0;

  const months = ['Jul', 'Ago', 'Sep', 'Oct'];
  return months.map((month, index) => ({
    month,
    projected: Number((baseline * (1 + index * 0.03)).toFixed(0)),
  }));
}

function buildDepartmentSpend(expenses: NormalizedExpenseRow[]) {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const key = getExpenseGroup(expense);
    totals.set(key, (totals.get(key) || 0) + getExpenseAmount(expense));
  }

  const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(totals.entries())
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(0)),
      percentage: total > 0 ? Number(((value / total) * 100).toFixed(0)) : 0,
    }))
    .sort((left, right) => right.value - left.value);
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({
        budget: { total: 0, spent: 0, remaining: 0 },
        expenses: [],
        budgetVsActual: [],
        forecast: [],
        departmentSpend: [],
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';

    const [{ data: budgetData }, { data: expensesData }] = await Promise.all([
      supabase.from('budgets').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
    ]);

    const expenses = ((expensesData || []) as ExpenseRow[]).map((expense) => ({
      ...expense,
      amount: getExpenseAmount(expense),
    })) as NormalizedExpenseRow[];

    const budgetTotal = toNumber(
      budgetData?.total ||
        budgetData?.budget_total ||
        budgetData?.annual_budget ||
        budgetData?.amount ||
        0
    );
    const spent = expenses.reduce((sum: number, expense) => sum + toNumber(expense.amount), 0);
    const remaining = Math.max(budgetTotal - spent, 0);

    const budgetVsActual = buildBudgetSeries(expenses, budgetTotal);
    const forecast = buildForecast(expenses);
    const departmentSpend = buildDepartmentSpend(expenses);

    return Response.json({
      budget: {
        total: budgetTotal,
        spent,
        remaining,
      },
      expenses,
      budgetVsActual,
      forecast,
      departmentSpend,
      period,
    });
  } catch (error) {
    console.error('[v0] Error in finanzas API:', error);
    return Response.json(
      {
        budget: { total: 0, spent: 0, remaining: 0 },
        expenses: [],
        budgetVsActual: [],
        forecast: [],
        departmentSpend: [],
      },
      { status: 500 }
    );
  }
}
