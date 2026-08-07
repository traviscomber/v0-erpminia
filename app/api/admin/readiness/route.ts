export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type Check = {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
  href?: string;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const checks: Check[] = [];

  const sources = [
    { id: 'maintenance', label: 'Órdenes de trabajo', table: 'maintenance_work_orders', href: '/dashboard/mantenimiento/ordenes-trabajo' },
    { id: 'preventive', label: 'Planes preventivos', table: 'preventive_maintenance_schedules', href: '/dashboard/mantenimiento/planificacion' },
    { id: 'inventory', label: 'Inventario', table: 'warehouse_stock', href: '/dashboard/bodega' },
    { id: 'purchasing', label: 'Compras', table: 'procurement_operational_orders', href: '/dashboard/compras' },
    { id: 'documents', label: 'Documentos', table: 'module_documents', href: '/dashboard/documentos-gestion' },
  ] as const;

  const results = await Promise.all(
    sources.map(async (source) => {
      const query = source.table === 'module_documents'
        ? context.supabase.from(source.table).select('id', { count: 'exact', head: true })
        : context.supabase.from(source.table).select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId);
      const result = await query;
      return { source, result };
    }),
  );

  for (const { source, result } of results) {
    if (result.error) {
      checks.push({ id: source.id, label: source.label, status: 'error', detail: 'La fuente no respondió correctamente.', href: source.href });
      continue;
    }
    const count = Number(result.count || 0);
    checks.push({
      id: source.id,
      label: source.label,
      status: count > 0 ? 'ok' : 'warning',
      detail: count > 0 ? `${count.toLocaleString('es-CL')} registros disponibles.` : 'Fuente operativa disponible, todavía sin registros para esta organización.',
      href: source.href,
    });
  }

  const membership = await context.supabase
    .from('user_roles')
    .select('organization_id')
    .eq('user_id', context.user.id)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  checks.unshift({
    id: 'access',
    label: 'Acceso y organización',
    status: membership.error || !membership.data ? 'error' : 'ok',
    detail: membership.error || !membership.data
      ? 'No se pudo confirmar la pertenencia del usuario a la organización activa.'
      : 'Sesión y pertenencia a la organización verificadas.',
  });

  const errorCount = checks.filter((check) => check.status === 'error').length;
  const warningCount = checks.filter((check) => check.status === 'warning').length;

  return NextResponse.json({
    status: errorCount > 0 ? 'blocked' : warningCount > 0 ? 'ready_with_observations' : 'ready',
    summary: { total: checks.length, ok: checks.filter((check) => check.status === 'ok').length, warnings: warningCount, errors: errorCount },
    checks,
    generatedAt: new Date().toISOString(),
    source: 'canonical',
  });
}
