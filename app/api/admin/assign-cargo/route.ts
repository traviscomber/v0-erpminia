export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// List users (scoped to the admin's organization) with their assigned cargo.
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name:
      p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
    role: p.role,
    cargo_id: p.cargo_id,
  }));

  return NextResponse.json({ users });
}

// Assign (or clear) a cargo for a user.
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

  if (!userId) {
    return NextResponse.json({ error: 'userId es obligatorio' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .update({ cargo_id: cargoId || null })
    .eq('id', userId)
    .eq('organization_id', auth.organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Cargo asignado' });
}
