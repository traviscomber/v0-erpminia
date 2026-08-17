export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function unauthorizedResponse(response: Response | null) {
  return response ?? NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return unauthorizedResponse(auth.response);
  const area = request.nextUrl.searchParams.get('area');
  const supabase = getSupabaseServerClient();
  let suppliers = supabase.from('suppliers').select('id,name,rut,business_type,city,region,status').eq('organization_id', auth.organizationId).eq('status', 'active').order('name').limit(500);
  let candidates = supabase.from('procurement_supplier_candidates').select('*').eq('organization_id', auth.organizationId).order('requested_at', { ascending: false }).limit(200);
  if (area) {
    suppliers = suppliers.ilike('business_type', `%${area}%`);
    candidates = candidates.ilike('business_type', `%${area}%`);
  }
  const [{ data: supplierRows, error: sErr }, { data: candidateRows, error: cErr }, { data: eppRows, error: eErr }, { data: profile }] = await Promise.all([
    suppliers,
    candidates,
    supabase.from('procurement_epp_supplier_comparison_v1').select('*').eq('organization_id', auth.organizationId).order('avg_cost_per_observed_day', { ascending: true, nullsFirst: false }).limit(200),
    supabase.from('profiles').select('role,cargos(name)').eq('id', auth.user.id).maybeSingle(),
  ]);
  if (sErr || cErr || eErr) return NextResponse.json({ error: sErr?.message || cErr?.message || eErr?.message || 'Error al cargar proveedores' }, { status: 500 });
  const cargoName = (profile as any)?.cargos?.name || '';
  const role = (profile as any)?.role || auth.role || '';
  const canApprove = ['JEFE BODEGA', 'JEFE ADM.', 'GERENTE', 'SUBGERENTE OP.'].includes(cargoName) || ['admin', 'superadmin'].includes(role);
  return NextResponse.json({ suppliers: supplierRows || [], candidates: candidateRows || [], eppComparison: eppRows || [], canApprove });
}

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) return unauthorizedResponse(auth.response);
  const body = await request.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('procurement_supplier_candidates').insert({
    organization_id: auth.organizationId,
    name: body.name,
    rut: body.rut || null,
    email: body.email || null,
    phone: body.phone || null,
    city: body.city || null,
    region: body.region || null,
    business_type: body.businessType || null,
    source_type: body.sourceType || 'market_research',
    source_reference: body.sourceReference || null,
    requested_by: auth.user.id,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user) return unauthorizedResponse(auth.response);
  const body = await request.json().catch(() => ({}));
  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase.from('profiles').select('role,cargos(name)').eq('id', auth.user.id).maybeSingle();
  const cargoName = (profile as any)?.cargos?.name || '';
  const role = (profile as any)?.role || auth.role || '';
  if (!(['JEFE BODEGA', 'JEFE ADM.', 'GERENTE', 'SUBGERENTE OP.'].includes(cargoName) || ['admin', 'superadmin'].includes(role))) {
    return NextResponse.json({ error: 'No autorizado para aprobar proveedores' }, { status: 403 });
  }
  const { data, error } = await supabase.rpc('approve_procurement_supplier_candidate_as', {
    p_actor_id: auth.user.id,
    p_candidate_id: body.id,
    p_approve: Boolean(body.approve),
    p_reason: body.reason || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ supplierId: data });
}
