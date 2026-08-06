export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { getDashboardSnapshot } from '@/lib/api/dashboard-snapshot';

type AssetRow = { id?: string | number; name?: string | null; status?: string | null; criticality?: string | null };
type WorkOrderRow = { id?: string | number; title?: string | null; work_order_number?: string | null; status?: string | null; priority?: string | null; scheduled_date?: string | null; created_at?: string | null; asset_id?: string | null };
type DocumentRow = { id?: string | number; title?: string | null; days_until_expiry?: number | null };
type StockRow = { id?: string | number; part_name?: string | null; part_code?: string | null; quantity_on_hand?: number | string | null; reorder_level?: number | string | null };
type DecisionLevel = 'critical' | 'high' | 'medium' | 'low';

function normalized(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function priorityWeight(value: unknown) {
  const priority = normalized(value);
  if (priority === 'critical') return 35;
  if (priority === 'high') return 25;
  if (priority === 'medium') return 12;
  return 5;
}

function levelWeight(level: DecisionLevel) {
  if (level === 'critical') return 4;
  if (level === 'high') return 3;
  if (level === 'medium') return 2;
  return 1;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const snapshot = await getDashboardSnapshot({ organizationId: context.organizationId, supabase: context.supabase });
    const assets = snapshot.assets as AssetRow[];
    const workOrders = snapshot.workOrders as WorkOrderRow[];
    const now = Date.now();

    const healthItems = assets.map((asset) => {
      const related = workOrders.filter((order) => String(order.asset_id || '') === String(asset.id || ''));
      const open = related.filter((order) => ['open', 'in_progress'].includes(normalized(order.status)));
      const overdue = open.filter((order) => order.scheduled_date && new Date(order.scheduled_date).getTime() < now);
      const recentCorrective = related.filter((order) => {
        const created = new Date(order.created_at || 0).getTime();
        return created >= now - 30 * 24 * 60 * 60 * 1000 && normalized(order.title).includes('correct');
      });

      let score = 0;
      const reasons: string[] = [];
      const status = normalized(asset.status);
      const criticality = normalized(asset.criticality);

      if (['critical', 'fuera de servicio', 'out_of_service'].includes(status) || criticality === 'critical') {
        score += 45;
        reasons.push('Equipo marcado como crítico o fuera de servicio');
      } else if (['maintenance', 'mantenimiento'].includes(status)) {
        score += 25;
        reasons.push('Equipo actualmente en mantenimiento');
      }

      if (open.length > 0) {
        score += Math.min(25, open.reduce((sum, order) => sum + priorityWeight(order.priority), 0));
        reasons.push(`${open.length} orden(es) de trabajo abiertas`);
      }
      if (overdue.length > 0) {
        score += Math.min(25, overdue.length * 10);
        reasons.push(`${overdue.length} orden(es) atrasadas`);
      }
      if (recentCorrective.length >= 3) {
        score += 15;
        reasons.push(`${recentCorrective.length} intervenciones correctivas recientes`);
      }

      score = Math.min(100, score);
      const level: DecisionLevel = score >= 70 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low';
      const action = overdue.length > 0
        ? 'Reprogramar o resolver las órdenes atrasadas'
        : open.length > 0
          ? 'Revisar responsables, materiales y fecha comprometida'
          : score >= 40
            ? 'Validar condición operacional del equipo'
            : 'Sin acción urgente';

      return { id: asset.id, name: asset.name || 'Equipo sin nombre', status: asset.status, score, level, reasons, action, openOrders: open.length, overdueOrders: overdue.length };
    }).sort((a, b) => b.score - a.score);

    const documents = (snapshot.expiringDocuments as DocumentRow[]).map((doc) => ({
      id: doc.id,
      title: doc.title || 'Documento',
      days: numberValue(doc.days_until_expiry),
      level: (numberValue(doc.days_until_expiry) <= 7 ? 'critical' : 'medium') as DecisionLevel,
      action: 'Renovar o validar vigencia',
    }));

    const stock = (snapshot.lowStockItems as StockRow[]).map((item) => ({
      id: item.id,
      title: item.part_name || item.part_code || 'Repuesto',
      quantity: numberValue(item.quantity_on_hand),
      reorderLevel: numberValue(item.reorder_level),
      level: (numberValue(item.quantity_on_hand) <= 0 ? 'critical' : 'high') as DecisionLevel,
      action: 'Revisar reposición y órdenes relacionadas',
    }));

    const decisions = [
      ...healthItems.filter((item) => item.level !== 'low').map((item) => ({ type: 'equipment', id: item.id, title: item.name, detail: item.reasons.join(' · '), level: item.level, action: item.action })),
      ...documents.map((item) => ({ type: 'document', id: item.id, title: item.title, detail: `Vence en ${item.days} día(s)`, level: item.level, action: item.action })),
      ...stock.map((item) => ({ type: 'stock', id: item.id, title: item.title, detail: `Disponible ${item.quantity}; mínimo ${item.reorderLevel}`, level: item.level, action: item.action })),
    ].sort((a, b) => levelWeight(b.level) - levelWeight(a.level)).slice(0, 30);

    return NextResponse.json({
      summary: {
        critical: decisions.filter((item) => item.level === 'critical').length,
        high: decisions.filter((item) => item.level === 'high').length,
        medium: decisions.filter((item) => item.level === 'medium').length,
        healthyAssets: healthItems.filter((item) => item.level === 'low').length,
        totalAssets: healthItems.length,
        operationalEfficiency: snapshot.insights.efficiency,
      },
      healthItems,
      decisions,
      generatedAt: new Date().toISOString(),
      policy: 'El nivel se calcula únicamente con estado, criticidad y órdenes registradas. No es una predicción de falla.',
    });
  } catch (error) {
    console.error('[operational-health]', error);
    return NextResponse.json({ error: 'No fue posible cargar el estado operacional.' }, { status: 500 });
  }
}
