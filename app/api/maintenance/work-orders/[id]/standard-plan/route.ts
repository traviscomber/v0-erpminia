export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const { data: application, error: applicationError } = await context.supabase
      .from('maintenance_standard_job_plan_applications')
      .select('plan_id,applied_at')
      .eq('organization_id', context.organizationId)
      .eq('work_order_id', id)
      .eq('status', 'active')
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application?.plan_id) return NextResponse.json({ standardPlan: null });

    const [{ data: plan, error: planError }, { data: steps, error: stepsError }, { data: materials, error: materialsError }] = await Promise.all([
      context.supabase.from('maintenance_standard_job_plans').select('id,plan_code,name,work_type,status,estimated_duration_hours,labor_people_required,skill_requirement,safety_controls,required_document_reference,evidence_reference').eq('organization_id', context.organizationId).eq('id', application.plan_id).maybeSingle(),
      context.supabase.from('maintenance_standard_job_plan_steps').select('id,sequence_no,title,instructions,control_requirement,required_document_reference,estimated_minutes').eq('organization_id', context.organizationId).eq('plan_id', application.plan_id).order('sequence_no'),
      context.supabase.from('maintenance_standard_job_plan_materials').select('id,canonical_product_id,quantity_required,notes').eq('organization_id', context.organizationId).eq('plan_id', application.plan_id),
    ]);
    const error = planError || stepsError || materialsError;
    if (error) throw error;
    if (!plan) return NextResponse.json({ standardPlan: null });

    const productIds = [...new Set((materials || []).map((row: any) => row.canonical_product_id).filter(Boolean))];
    const productMap = new Map<string, any>();
    if (productIds.length) {
      const { data: products, error: productError } = await context.supabase.schema('canonical').from('products').select('id,product_code,name,unit').eq('organization_id', context.organizationId).in('id', productIds);
      if (productError) throw productError;
      for (const product of products || []) productMap.set(product.id, product);
    }

    return NextResponse.json({
      standardPlan: {
        ...plan,
        applied_at: application.applied_at,
        steps: steps || [],
        materials: (materials || []).map((row: any) => ({ ...row, product: productMap.get(row.canonical_product_id) || null })),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el plan estándar de la OT' }, { status: 500 });
  }
}
