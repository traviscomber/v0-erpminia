import { createClient } from '@supabase/supabase-js';

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

    // Fetch budget data
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*')
      .limit(1)
      .single();

    // Fetch expenses
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    // Mock budget vs actual data
    const budgetVsActual = [
      { month: 'Ene', budget: 2000000, actual: 1800000 },
      { month: 'Feb', budget: 2200000, actual: 2100000 },
      { month: 'Mar', budget: 1900000, actual: 2050000 },
      { month: 'Abr', budget: 2100000, actual: 1950000 },
      { month: 'May', budget: 2300000, actual: 2200000 },
      { month: 'Jun', budget: 2000000, actual: 1900000 },
    ];

    // Mock forecast data
    const forecast = [
      { month: 'Jul', projected: 2150000 },
      { month: 'Ago', projected: 2280000 },
      { month: 'Sep', projected: 2100000 },
      { month: 'Oct', projected: 2350000 },
    ];

    // Mock department spend
    const departmentSpend = [
      { name: 'Operaciones', value: 45000000, percentage: 45 },
      { name: 'Recursos Humanos', value: 15000000, percentage: 15 },
      { name: 'Tecnología', value: 20000000, percentage: 20 },
      { name: 'Marketing', value: 12000000, percentage: 12 },
      { name: 'Otros', value: 8000000, percentage: 8 },
    ];

    return Response.json({
      budget: budgetData || {
        total: 12300000,
        spent: 11200000,
        remaining: 1100000,
      },
      expenses: expensesData || [
        { id: 'FAC001', vendor: 'Proveedor A', amount: 2500000, status: 'Pagada', date: new Date() },
        { id: 'FAC002', vendor: 'Proveedor B', amount: 1800000, status: 'Pendiente', date: new Date() },
        { id: 'FAC003', vendor: 'Proveedor C', amount: 950000, status: 'Vencida', date: new Date() },
      ],
      budgetVsActual,
      forecast,
      departmentSpend,
    });
  } catch (error) {
    console.error('[v0] Error in finanzas API:', error);
    return Response.json(
      { error: 'Error loading financial data' },
      { status: 500 }
    );
  }
}
