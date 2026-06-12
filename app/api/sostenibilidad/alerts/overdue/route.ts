import { NextRequest, NextResponse } from 'next/server';
import {
  getSustainabilityContext,
  normalizeCorrectiveActionStatus,
  normalizeNcStatus,
} from '@/lib/api/sostenibilidad-mvp';

type OverdueAlert = {
  id: string;
  type: 'nc_overdue' | 'ca_overdue';
  number: string;
  title: string;
  severity: string;
  days_overdue: number;
  status: 'active';
  related_entity: string;
  related_nc?: string;
  action_required: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
};

function calculateDaysOverdue(targetDate: string) {
  const target = new Date(targetDate);
  const today = new Date();
  const diffTime = today.getTime() - target.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculatePriority(severity: string, daysOverdue: number): OverdueAlert['priority'] {
  const normalizedSeverity = String(severity || '').trim().toLowerCase();
  if (normalizedSeverity === 'critical' || normalizedSeverity === 'crítica' || daysOverdue > 14) return 'critical';
  if (normalizedSeverity === 'high' || normalizedSeverity === 'alta' || daysOverdue > 7) return 'high';
  if (normalizedSeverity === 'medium' || normalizedSeverity === 'media' || daysOverdue > 3) return 'medium';
  return 'low';
}

// GET /api/sostenibilidad/alerts/overdue
export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = new URL(request.url).searchParams;
    const severity = searchParams.get('severity');

    const [{ data: overdueNCs, error: ncError }, { data: overdueCAs, error: caError }] =
      await Promise.all([
        context.supabase
          .from('sostenibilidad_nonconformances')
          .select('id, nc_number, title, severity, target_closure_date, status')
          .eq('organization_id', context.organizationId)
          .neq('status', 'closed')
          .lt('target_closure_date', new Date().toISOString().split('T')[0]),
        context.supabase
          .from('sostenibilidad_corrective_actions')
          .select(
            `id, ca_number, action_description, status, scheduled_completion_date,
             sostenibilidad_nonconformances!inner(nc_number, title, severity)`
          )
          .eq('organization_id', context.organizationId)
          .neq('status', 'completed')
          .neq('status', 'verified')
          .lt('scheduled_completion_date', new Date().toISOString().split('T')[0]),
      ]);

    if (ncError) throw ncError;
    if (caError) throw caError;

    const alerts: OverdueAlert[] = [];

    (overdueNCs || []).forEach((nc) => {
      const daysOverdue = calculateDaysOverdue(nc.target_closure_date);
      const normalizedSeverity = String(nc.severity || 'medium').toLowerCase();
      alerts.push({
        id: nc.id,
        type: 'nc_overdue',
        number: nc.nc_number,
        title: nc.title,
        severity: normalizedSeverity,
        days_overdue: daysOverdue,
        status: 'active',
        related_entity: 'No conformidad',
        action_required: daysOverdue > 7,
        priority: calculatePriority(normalizedSeverity, daysOverdue),
      });
    });

    (overdueCAs || []).forEach((ca) => {
      const daysOverdue = calculateDaysOverdue(ca.scheduled_completion_date);
      const ncData = ca.sostenibilidad_nonconformances?.[0] || { severity: 'medium', nc_number: 'N/A' };
      const normalizedSeverity = String(ncData.severity || 'medium').toLowerCase();
      alerts.push({
        id: ca.id,
        type: 'ca_overdue',
        number: ca.ca_number,
        title: ca.action_description,
        severity: normalizedSeverity,
        days_overdue: daysOverdue,
        status: 'active',
        related_entity: 'Acción correctiva',
        related_nc: ncData.nc_number,
        action_required: daysOverdue > 3,
        priority: calculatePriority(normalizedSeverity, daysOverdue),
      });
    });

    const filteredAlerts = severity
      ? alerts.filter((alert) => alert.severity === severity.toLowerCase())
      : alerts;

    filteredAlerts.sort((a, b) => {
      const priorityOrder: Record<OverdueAlert['priority'], number> = {
        critical: 3,
        high: 2,
        medium: 1,
        low: 0,
      };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return NextResponse.json({
      total_alerts: alerts.length,
      critical_alerts: alerts.filter((alert) => alert.priority === 'critical').length,
      high_alerts: alerts.filter((alert) => alert.priority === 'high').length,
      alerts: filteredAlerts,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching overdue alerts:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch alerts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/sostenibilidad/alerts/overdue - Mark alert as resolved
export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const { alert_id, alert_type, resolved_notes } = body;

    if (!alert_id || !alert_type) {
      return NextResponse.json(
        { error: 'Missing required fields: alert_id, alert_type' },
        { status: 400 }
      );
    }

    if (alert_type === 'nc_overdue') {
      await context.supabase
        .from('sostenibilidad_nonconformances')
        .update({
          status: normalizeNcStatus('in_progress'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', alert_id)
        .eq('organization_id', context.organizationId);
    } else if (alert_type === 'ca_overdue') {
      await context.supabase.from('sostenibilidad_ca_updates').insert([
        {
          ca_id: alert_id,
          status: normalizeCorrectiveActionStatus('in_progress'),
          comments: resolved_notes || 'Alerta revisada',
          update_type: 'alert_resolution',
          created_at: new Date().toISOString(),
        },
      ]);
    }

    await context.supabase.from('event_log').insert([
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
      message: 'Alert marked as reviewed',
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    const message = error instanceof Error ? error.message : 'Failed to resolve alert';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
