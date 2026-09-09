export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, first_name, last_name, role, cargo_id')
    .eq('organization_id', auth.organizationId)
    .order('email');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email,
    role: profile.role,
    cargo_id: profile.cargo_id,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { userId?: string; cargoId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { userId, cargoId } = body;
  if (!userId) return NextResponse.json({ error: 'userId es obligatorio' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  if (cargoId) {
    const { data: cargo, error: cargoError } = await supabase
      .from('cargos')
      .select('id')
      .eq('id', cargoId)
      .maybeSingle();
    if (cargoError) return NextResponse.json({ error: cargoError.message }, { status: 500 });
    if (!cargo) return NextResponse.json({ error: 'Cargo no encontrado' }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ cargo_id: cargoId || null, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('organization_id', auth.organizationId)
    .select('id,cargo_id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: 'Usuario no encontrado en esta organización' }, { status: 404 });

  return NextResponse.json({ message: 'Cargo asignado', user: updated });
}
