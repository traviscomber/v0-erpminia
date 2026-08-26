export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getModuleAccessLevel, MODULE_KEYS } from '@/lib/api/module-access';

const CLOSED = new Set(['completed','closed','cancelled','canceled','completada','cerrada','cancelada']);
const HIGH = new Set(['critical','critica','high','alta']);
const norm = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('es-CL');

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const access = await getModuleAccessLevel(context.userId, context.role, MODULE_KEYS.MANT_GERENCIAL);
  if (access !== 'LEC' && access !== 'ED') return NextResponse.json({ error: 'Acceso gerencial de Mantención no autorizado' }, { status: 403 });

  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const [woResult, assetResult] = await Promise.all([
      context.supabase.from('maintenance_work_orders')
        .select('id,asset_id,status,priority,work_type,created_at,scheduled_date,total_timer_minutes')
        .eq('organization_id', context.organizationId)
        .gte('created_at', since.toISOString()),
      context.supabase.from('maintenance_assets')
        .select('id,asset_code,asset_name,criticality,status')
        .eq('organization_id', context.organizationId),
    ]);
    const error = woResult.error || assetResult.error;
    if (error) throw error;

    const assetMap = new Map((assetResult.data || []).map((a) => [a.id, a]));
    const groups = new Map<string, any[]>();
    for (const wo of woResult.data || []) {
      if (!wo.asset_id) continue;
      const rows = groups.get(wo.asset_id) || [];
      rows.push(wo);
      groups.set(wo.asset_id, rows);
    }

    const now = Date.now();
    const data = [...groups.entries()].map(([assetId, rows]) => {
      const asset = assetMap.get(assetId);
      const open = rows.filter((wo) => !CLOSED.has(norm(wo.status)));
      const highOpen = open.filter((wo) => HIGH.has(norm(wo.priority)));
      const overdue = open.filter((wo) => wo.scheduled_date && new Date(`${wo.scheduled_date}T23:59:59Z`).getTime() < now);
      const timed = rows.filter((wo) => Number(wo.total_timer_minutes || 0) > 0);
      return {
        assetId,
        assetCode: asset?.asset_code || null,
        assetName: asset?.asset_name || 'Equipo sin ficha',
        criticality: asset?.criticality || null,
        workOrders90d: rows.length,
        openWorkOrders: open.length,
        highPriorityOpen: highOpen.length,
        overdueOpen: overdue.length,
        observedRepairHours: timed.length ? timed.reduce((s, wo) => s + Number(wo.total_timer_minutes || 0), 0) / timed.length / 60 : null,
        attention: highOpen.length > 0 || overdue.length >= 2 ? 'high' : open.length > 0 ? 'watch' : 'ok',
        evidence: `${open.length} OT abiertas · ${highOpen.length} de prioridad alta/crítica · ${overdue.length} vencidas`,
      };
    }).sort((a, b) => (a.attention === b.attention ? b.openWorkOrders - a.openWorkOrders : a.attention === 'high' ? -1 : b.attention === 'high' ? 1 : a.attention === 'watch' ? -1 : 1)).slice(0, 20);

    return NextResponse.json({ data, policy: 'La prioridad se deriva de OT abiertas, prioridad registrada y vencimiento. No se calcula probabilidad de falla ni risk score artificial.', generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[maintenance/analytics/equipment-risk]', error);
    return NextResponse.json({ error: 'No fue posible calcular riesgo operacional por equipo' }, { status: 500 });
  }
}
