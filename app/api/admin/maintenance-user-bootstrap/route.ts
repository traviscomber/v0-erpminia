export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api/guard';

const ONE_TIME_TOKEN = 'maintenance-20260910-b41f6c8d';
const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

const TARGETS = [
  { profileId: 'ca0e03a8-7eb4-4c97-992f-25f21cbe678f', peopleId: '83046f95-d836-4c8b-a6d1-6bb57388dc3d', email: 'gustavo.vega@lapatagua.cl', fullName: 'Gustavo Vega', cargoId: '7b3bc5c8-aaba-407a-9e70-e27fcfc4759e', role: 'tecnico' },
  { profileId: '6bc039fa-ac0e-4be8-b4ee-444a13996581', peopleId: '8b203446-7b08-418a-966d-acf094c62fb5', email: 'ariellopez@lapatagua.cl', fullName: 'Ariel López', cargoId: '3479bcb9-fb3e-4add-bd19-884640a29193', role: 'admin' },
  { profileId: 'cd2506fa-976a-432b-b40e-ea2ba9849f22', peopleId: '663d503f-8a02-4257-ae77-63aca0e46d5a', email: 'mastudillo@lapatagua.cl', fullName: 'Mauricio Astudillo', cargoId: '5ca8c245-e33d-4fc4-891c-beb6f52e40d1', role: 'jefe_mantencion' },
  { profileId: '8231e775-351f-46ef-85f4-1b4748f98b29', peopleId: '7d8d0c85-91da-405a-96cf-442c278b452d', email: 'rodrigo.olmos@lapatagua.cl', fullName: 'Rodrigo Olmos', cargoId: '4bed2508-fd0f-4007-a669-a1f93df4e000', role: 'tecnico' },
  { profileId: '939ff27e-21e9-4e54-be2f-671ff80d73cb', peopleId: 'ace63a22-8782-4334-8773-4ff3462e51ce', email: 'arturo.silva@lapatagua.cl', fullName: 'Arturo Silva', cargoId: 'a2b6985b-58ce-4620-baae-b34fcd5804d8', role: 'tecnico' },
  { profileId: '2abf0e7e-bdb9-4d5e-80ac-d5124643dec9', peopleId: 'e5516700-50e0-404c-8b50-0419ea23d1cc', email: 'joaquin.martinez@lapatagua.cl', fullName: 'Joaquín Martínez', cargoId: '4509003e-ee72-4769-bd8e-9e6fb3699f6e', role: 'tecnico' },
  { profileId: '95bcb9a5-f982-4c1f-975d-2ae569943c6d', peopleId: '0261bfdd-5d8b-43e1-8fda-de453feaa9ee', email: 'juan.araya@lapatagua.cl', fullName: 'Juan Araya', cargoId: '22e777f4-38e4-4bf4-a527-349e8d10dc36', role: 'tecnico' },
  { profileId: 'd169a69d-0a6a-427d-8c57-28711ce6763d', peopleId: '83243983-ffae-416a-9f6f-9b7da0db23bd', email: 'jose.tapia@lapatagua.cl', fullName: 'José Tapia', cargoId: '79d7dede-6b62-4f09-b471-d9b6a523d079', role: 'tecnico' },
  { profileId: '6373adc6-0214-4abf-9694-b19c0cf529cd', peopleId: 'ace6b390-4462-496c-9b24-276fd5e6e6d6', email: 'eders.aguirre@lapatagua.cl', fullName: 'Eders Aguirre', cargoId: '9b8d2384-eb41-4dc1-bc21-8829f7c434ce', role: 'tecnico' },
] as const;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service configuration');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function hasToken(request: NextRequest) {
  return request.nextUrl.searchParams.get('token') === ONE_TIME_TOKEN;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!hasToken(request)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>MOTIL · Activación usuarios Mantenimiento</title></head><body style="font-family:system-ui;background:#111;color:#eee;padding:32px"><h1>Activando usuarios de Mantenimiento…</h1><pre id="out">Procesando</pre><script>
const password = decodeURIComponent(location.hash.slice(1));
const out = document.getElementById('out');
if (!password) out.textContent = 'Falta la contraseña en el fragmento de URL.';
else fetch(location.pathname + location.search, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ password }) })
  .then(async r => ({ ok: r.ok, text: await r.text() }))
  .then(({ok,text}) => { out.textContent = text; document.title = ok ? 'MOTIL · Usuarios listos' : 'MOTIL · Error de activación'; history.replaceState(null, '', '/dashboard/admin/users'); })
  .catch(e => { out.textContent = String(e); });
</script></body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!hasToken(request)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const password = String(body?.password || '');
  if (password.length < 8) return NextResponse.json({ error: 'Clave inválida' }, { status: 400 });

  const sb = getServiceSupabase();
  const listed = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) return NextResponse.json({ error: listed.error.message }, { status: 500 });
  const users = listed.data.users;
  const results: Array<Record<string, unknown>> = [];

  for (const target of TARGETS) {
    const existingLink = await sb.from('auth_profile_identity_links').select('auth_user_id').eq('profile_id', target.profileId).maybeSingle();
    let authUser = users.find((u) => u.id === existingLink.data?.auth_user_id || u.id === target.profileId || (u.email || '').toLowerCase() === target.email.toLowerCase());

    if (authUser) {
      const updated = await sb.auth.admin.updateUserById(authUser.id, { email: target.email, password, email_confirm: true, user_metadata: { full_name: target.fullName } });
      if (updated.error || !updated.data.user) { results.push({ email: target.email, ok: false, step: 'auth_update', error: updated.error?.message }); continue; }
      authUser = updated.data.user;
    } else {
      const created = await sb.auth.admin.createUser({ email: target.email, password, email_confirm: true, user_metadata: { full_name: target.fullName } });
      if (created.error || !created.data.user) { results.push({ email: target.email, ok: false, step: 'auth_create', error: created.error?.message }); continue; }
      authUser = created.data.user;
      users.push(authUser);
    }

    const profile = await sb.from('profiles').update({ email: target.email, full_name: target.fullName, first_name: target.fullName.split(' ')[0], last_name: target.fullName.split(' ').slice(1).join(' '), cargo_id: target.cargoId, role: target.role, status: 'active', updated_at: new Date().toISOString() }).eq('id', target.profileId).eq('organization_id', ORG_ID);
    if (profile.error) { results.push({ email: target.email, ok: false, step: 'profile', error: profile.error.message }); continue; }

    const userRole = await sb.from('user_roles').upsert({ user_id: target.profileId, organization_id: ORG_ID, role: target.role }, { onConflict: 'user_id,organization_id' });
    if (userRole.error) { results.push({ email: target.email, ok: false, step: 'role', error: userRole.error.message }); continue; }

    const oldLink = await sb.from('auth_profile_identity_links').select('auth_user_id').eq('profile_id', target.profileId).maybeSingle();
    if (oldLink.data?.auth_user_id && oldLink.data.auth_user_id !== authUser.id) {
      await sb.from('auth_profile_identity_links').delete().eq('profile_id', target.profileId);
    }
    const link = await sb.from('auth_profile_identity_links').upsert({ auth_user_id: authUser.id, profile_id: target.profileId, linked_email: target.email, link_reason: 'maintenance_orgchart_activation_20260910', updated_at: new Date().toISOString() }, { onConflict: 'auth_user_id' });
    if (link.error) { results.push({ email: target.email, ok: false, step: 'identity_link', error: link.error.message }); continue; }

    const person = await sb.from('people').update({ email: target.email, profile_id: target.profileId, employment_status: 'active', updated_at: new Date().toISOString() }).eq('id', target.peopleId).eq('organization_id', ORG_ID);
    if (person.error) { results.push({ email: target.email, ok: false, step: 'people', error: person.error.message }); continue; }

    results.push({ email: target.email, ok: true, authUserId: authUser.id, profileId: target.profileId });
  }

  const ok = results.length === TARGETS.length && results.every((item) => item.ok === true);
  return NextResponse.json({ ok, count: results.length, results }, { status: ok ? 200 : 500 });
}
