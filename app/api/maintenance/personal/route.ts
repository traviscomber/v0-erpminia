export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type MaintenanceWorkOrderIdRow = {
  id: string;
};

type MaintenanceTimeEntryRow = {
  technician_id: string | null;
  horas_trabajadas: number | string | null;
  technician?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

type TechnicianSummary = {
  technicianId: string;
  name: string;
  email: string;
  hours: number;
  entries: number;
};

type MaintenanceTimeEntryItem = MaintenanceTimeEntryRow & {
  id?: string;
  ot_id?: string | null;
  descripcion?: string | null;
  fecha?: string | null;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: workOrders, error: woError } = await context.supabase
      .from('maintenance_work_orders')
      .select('id')
      .eq('organization_id', context.organizationId);

    if (woError) throw woError;

    const otIds = Array.isArray(workOrders) ? (workOrders as MaintenanceWorkOrderIdRow[]).map((order) => order.id).filter(Boolean) : [];
    if (otIds.length === 0) {
      return NextResponse.json({ summary: { totalHours: 0, totalEntries: 0, technicians: 0 }, technicians: [], recentEntries: [] });
    }

    const pageSize = 1000;
    const entries: MaintenanceTimeEntryItem[] = [];
    let start = 0;

    while (true) {
      const end = start + pageSize - 1;
      const { data, error } = await context.supabase
        .from('mantenimiento_tiempo')
        .select('id, ot_id, technician_id, horas_trabajadas, descripcion, fecha, technician:users(id, email, full_name)')
        .in('ot_id', otIds)
        .order('fecha', { ascending: false })
        .range(start, end);

      if (error) throw error;

      const batch = Array.isArray(data) ? (data as MaintenanceTimeEntryItem[]) : [];
      entries.push(...batch);
      if (batch.length < pageSize) break;
      start += pageSize;
    }

    const techniciansMap = new Map<string, TechnicianSummary>();

    for (const entry of entries) {
      const techId = String(entry.technician_id || '');
      const current: TechnicianSummary = techniciansMap.get(techId) || {
        technicianId: techId,
        name: entry.technician?.full_name || entry.technician?.email || techId || 'Tecnico',
        email: entry.technician?.email || '',
        hours: 0,
        entries: 0,
      };

      current.hours += Number(entry.horas_trabajadas || 0);
      current.entries += 1;
      techniciansMap.set(techId, current);
    }

    const technicians = [...techniciansMap.values()].sort((a, b) => b.hours - a.hours);

    return NextResponse.json({
      summary: {
        totalHours: entries.reduce((sum, entry) => sum + Number(entry.horas_trabajadas || 0), 0),
        totalEntries: entries.length,
        technicians: technicians.length,
      },
      technicians,
      recentEntries: entries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el personal de mantenimiento';
    return NextResponse.json({ summary: { totalHours: 0, totalEntries: 0, technicians: 0 }, technicians: [], recentEntries: [], error: message }, { status: 500 });
  }
}
