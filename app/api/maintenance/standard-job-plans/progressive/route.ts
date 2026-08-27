export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const text = (value: unknown) => String(value ?? '').trim();
const num = (value: unknown) => Number(value ?? 0);

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const scheduleId = text(request.nextUrl.searchParams.get('scheduleId'));
  if (!scheduleId) return NextResponse.json({ error: 'Falta scheduleId.' }, { status: 400 });

  try {
    const { data: schedule, error: scheduleError } = await context.supabase
      .from('preventive_maintenance_schedules')
      .select('id,task_name,description,frequency_hours,estimated_duration_hours,canonical_asset_id,source_reference')
      .eq('organization_id', context.organizationId)
      .eq('id', scheduleId)
      .maybeSingle();
    if (scheduleError) throw scheduleError;
    if (!schedule) return NextResponse.json({ error: 'Pauta preventiva no encontrada.' }, { status: 404 });

    const { data: applications, error: applicationError } = await context.supabase
      .from('maintenance_standard_job_plan_applications')
      .select('plan_id,status,created_at')
      .eq('organization_id', context.organizationId)
      .eq('preventive_schedule_id', scheduleId)
      .order('created_at', { ascending: false });
    if (applicationError) throw applicationError;

    const planId = applications?.[0]?.plan_id || null;
    let plan: any = null;
    let steps: any[] = [];
    let materials: any[] = [];
    if (planId) {
      const [planResult, stepsResult, materialsResult] = await Promise.all([
        context.supabase.from('maintenance_standard_job_plans').select('*').eq('organization_id', context.organizationId).eq('id', planId).maybeSingle(),
        context.supabase.from('maintenance_standard_job_plan_steps').select('*').eq('organization_id', context.organizationId).eq('plan_id', planId).order('sequence_no'),
        context.supabase.from('maintenance_standard_job_plan_materials').select('*').eq('organization_id', context.organizationId).eq('plan_id', planId),
      ]);
      if (planResult.error) throw planResult.error;
      if (stepsResult.error) throw stepsResult.error;
      if (materialsResult.error) throw materialsResult.error;
      plan = planResult.data;
      steps = stepsResult.data || [];
      materials = materialsResult.data || [];
    }

    return NextResponse.json({ schedule, plan, steps, materials, canEdit: access.canWrite });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el plan progresivo.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = text(body?.action);
  const moduleKey = action === 'approve' ? MODULE_KEYS.MANT_GERENCIAL : MODULE_KEYS.MANT_OPERACIONES;
  const access = await requireModuleAccess(request, moduleKey, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    if (action === 'propose') {
      const scheduleId = text(body?.scheduleId);
      const { data, error } = await context.supabase.rpc('propose_standard_job_plan_from_schedule_v1', { p_schedule_id: scheduleId });
      if (error) throw error;
      return NextResponse.json({ ok: true, planId: data });
    }

    const planId = text(body?.planId);
    if (!planId) return NextResponse.json({ error: 'Falta planId.' }, { status: 400 });
    const { data: plan } = await context.supabase.from('maintenance_standard_job_plans').select('id,status').eq('organization_id', context.organizationId).eq('id', planId).maybeSingle();
    if (!plan) return NextResponse.json({ error: 'Plan estándar no encontrado.' }, { status: 404 });

    if (action === 'add_step') {
      const title = text(body?.title);
      if (!title) return NextResponse.json({ error: 'El paso requiere título.' }, { status: 400 });
      const { data, error } = await context.supabase.rpc('add_standard_job_plan_step_v1', {
        p_plan_id: planId,
        p_title: title,
        p_instructions: text(body?.instructions) || null,
        p_control_requirement: text(body?.controlRequirement) || null,
        p_estimated_minutes: body?.estimatedMinutes ? num(body.estimatedMinutes) : null,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, stepId: data });
    }

    if (action === 'add_material') {
      if (plan.status !== 'proposed') return NextResponse.json({ error: 'Sólo se editan planes propuestos.' }, { status: 409 });
      const productCode = text(body?.productCode);
      const quantity = num(body?.quantityRequired);
      if (!productCode || !Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: 'Indica producto canónico y cantidad válida.' }, { status: 400 });
      const canonical = context.supabase.schema('canonical');
      const { data: product } = await canonical.from('products').select('id,product_code,name').eq('organization_id', context.organizationId).eq('product_code', productCode).maybeSingle();
      if (!product) return NextResponse.json({ error: `Producto canónico no encontrado: ${productCode}` }, { status: 404 });
      const { error } = await context.supabase.from('maintenance_standard_job_plan_materials').insert({
        organization_id: context.organizationId,
        plan_id: planId,
        canonical_product_id: product.id,
        quantity_required: quantity,
        notes: text(body?.notes) || null,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, product });
    }

    if (action === 'approve') {
      const { data, error } = await context.supabase.rpc('approve_standard_job_plan_v1', { p_plan_id: planId });
      if (error) throw error;
      return NextResponse.json({ ok: true, planId: data });
    }

    return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar el plan estándar.' }, { status: 500 });
  }
}
