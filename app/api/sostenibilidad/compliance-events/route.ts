export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function normalizeEventStatus(dueDate: string, status: string | null) {
  if (status === 'completed') return 'completed';
  return new Date(dueDate).getTime() < Date.now() ? 'overdue' : 'pending';
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const limit = Number(searchParams.get('limit') || 20);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('compliance_events')
      .select('*')
      .eq('org_id', auth.organizationId)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const events = (data || []).map((event) => ({
      ...event,
      status: normalizeEventStatus(event.due_date, event.status),
    }));

    return NextResponse.json({
      data: events,
      stats: {
        total: events.length,
        pending: events.filter((event) => event.status === 'pending').length,
        completed: events.filter((event) => event.status === 'completed').length,
        overdue: events.filter((event) => event.status === 'overdue').length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los eventos de cumplimiento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = getSupabaseServerClient();
    const dueDate = String(body.due_date || body.dueDate || '').trim();

    if (!body.title || !dueDate || !body.event_type) {
      return NextResponse.json(
        { error: 'title, due_date and event_type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('compliance_events')
      .insert({
        org_id: auth.organizationId,
        title: String(body.title).trim(),
        description: String(body.description || '').trim() || null,
        event_type: String(body.event_type).trim(),
        due_date: dueDate,
        frequency: String(body.frequency || 'one_time').trim(),
        next_date: body.next_date || null,
        status: normalizeEventStatus(dueDate, body.status),
        responsible_person_id: auth.user.id,
        related_documents: body.related_documents || [],
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el evento de cumplimiento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
