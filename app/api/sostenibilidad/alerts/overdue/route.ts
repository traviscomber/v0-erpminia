export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeCorrectiveActionStatus, normalizeNcStatus } from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const status = searchParams.get('status') || 'activa';

    const { data: overdueNCs } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('id, nc_number, title, severity, target_closure_date, status')
      .lt('target_closure_date', new Date().toLocaleDateString('en-CA'))
      .neq('status', 'closed');

    const { data: overdueCAs } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select(
        `id, ca_number, action_description, status, scheduled_completion_date,
         sostenibilidad_nonconformances!inner(nc_number, title, severity)`
      )
      .lt('scheduled_completion_date', new Date().toLocaleDateString('en-CA'))
      .neq('status', 'verified');

    const alerts: any[] = [];

    (overdueNCs || []).map((nc: any) => ({
      ...nc,
      status: normalizeNcStatus(nc.status),
    })).filter((nc: any) => nc.status !== 'closed').forEach((nc) => {
      const daysOverdue = calculateDaysOverdue(nc.target_closure_date);
      alerts.push({
        id: nc.id,
        type: 'nc_overdue',
        number: nc.nc_number,
        title: nc.title,
        severity: nc.severity,
        days_overdue: daysOverdue,
        status: 'active',
        related_entity: 'No-Conformidad',
        action_required: daysOverdue > 7,
        priority: calculatePriority(nc.severity, daysOverdue),
      });
    });

    (overdueCAs || []).map((ca: any) => ({
      ...ca,
      status: normalizeCorrectiveActionStatus(ca.status),
    })).filter((ca: any) => ca.status !== 'verified').forEach((ca: any) => {
      const daysOverdue = calculateDaysOverdue(ca.scheduled_completion_date);
      const ncData = ca.sostenibilidad_nonconformances[0] || { severity: 'media', nc_number: 'N/A' };
      alerts.push({
        id: ca.id,
        type: 'ca_overdue',
        number: ca.ca_number,
        title: ca.action_description,
        severity: ncData.severity,
        days_overdue: daysOverdue,
        status: 'active',
        related_entity: 'Acción Correctiva',
        related_nc: ncData.nc_number,
        action_required: daysOverdue > 3,
        priority: calculatePriority(ncData.severity, daysOverdue),
      });
    });

    let filteredAlerts = alerts;
    if (severity) {
      filteredAlerts = alerts.filter((a) => a.severity === severity);
    }

    filteredAlerts.sort((a, b) => {
      const priorityOrder: Record<string, number> = { crítica: 3, alta: 2, media: 1, baja: 0 };
      return (
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      );
    });

    return NextResponse.json({
      total_alerts: alerts.length,
      critical_alerts: alerts.filter((a) => a.priority === 'crítica').length,
      high_alerts: alerts.filter((a) => a.priority === 'alta').length,
      alerts: filteredAlerts,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching overdue alerts:', error);
    return NextResponse.json({
      total_alerts: 0,
      critical_alerts: 0,
      high_alerts: 0,
      alerts: [],
      last_updated: new Date().toISOString(),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { alert_id, alert_type, resolved_notes } = body;

    if (!alert_id || !alert_type) {
      return NextResponse.json(
        { error: 'Missing required fields: alert_id, alert_type' },
        { status: 400 }
      );
    }

    if (alert_type === 'nc_overdue') {
      await supabase
        .from('sostenibilidad_nonconformances')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', alert_id);
    } else if (alert_type === 'ca_overdue') {
      await supabase
        .from('sostenibilidad_corrective_actions')
        .select('ca_number')
        .eq('id', alert_id)
        .single();

      await supabase.from('sostenibilidad_ca_updates').insert([
        {
          ca_id: alert_id,
          status: 'revisada',
          comments: resolved_notes || 'Alerta revisada',
          update_type: 'alert_resolution',
          created_at: new Date().toISOString(),
        },
      ]);
    }

    await supabase.from('event_log').insert([
      {
        source_module: 'sostenibilidad',
        source_table: 'alerts',
        source_id: alert_id,
        event_type: 'alert_resolved',
        payload: { alert_type, resolved_notes },
        status: 'processed',
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Alerta marcada como revisada',
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { error: 'No se pudo resolver la alerta' },
      { status: 500 }
    );
  }
}

function calculateDaysOverdue(targetDate: string): number {
  const target = new Date(targetDate);
  const today = new Date();
  const diffTime = today.getTime() - target.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculatePriority(severity: string, daysOverdue: number): string {
  if (severity === 'crítica' || daysOverdue > 14) return 'crítica';
  if (severity === 'alta' || daysOverdue > 7) return 'alta';
  if (severity === 'media' || daysOverdue > 3) return 'media';
  return 'baja';
}
