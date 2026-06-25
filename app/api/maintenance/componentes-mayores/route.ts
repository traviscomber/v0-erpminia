export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [templatesResult, componentsResult, vehiclesResult, faultModesResult] = await Promise.all([
      context.supabase.from('components_template').select('id, vehicle_type, name, code, parent_id, level, description'),
      context.supabase.from('components').select('id, vehicle_id, template_id, code, name, parent_id, status, last_maintenance, maintenance_hours, created_at'),
      context.supabase.from('vehicles').select('id, code, name, vehicle_type, model, status, site'),
      context.supabase.from('fault_modes').select('id, component_template_id, fault_code, fault_name, severity'),
    ]);

    if (templatesResult.error) throw templatesResult.error;
    if (componentsResult.error) throw componentsResult.error;
    if (vehiclesResult.error) throw vehiclesResult.error;
    if (faultModesResult.error) throw faultModesResult.error;

    const templates = templatesResult.data || [];
    const components = componentsResult.data || [];
    const vehicles = vehiclesResult.data || [];
    const faultModes = faultModesResult.data || [];

    const vehicleMap = new Map(vehicles.map((vehicle: any) => [vehicle.id, vehicle]));
    const templateMap = new Map(templates.map((template: any) => [template.id, template]));

    const majorTemplates = templates.filter((template: any) => Number(template.level || 0) <= 1 || ['motor', 'transmision', 'diferenciales', 'bombas', 'cilindros', 'enfriadores', 'perforadoras', 'baldes'].some((part) => String(template.name || '').toLowerCase().includes(part)));

    const componentsByTemplate = majorTemplates.map((template: any) => {
      const instances = components.filter((component: any) => component.template_id === template.id);
      const faultCount = faultModes.filter((fault: any) => fault.component_template_id === template.id).length;
      const degraded = instances.filter((instance: any) => String(instance.status || '').toLowerCase() === 'degradado').length;
      const failure = instances.filter((instance: any) => String(instance.status || '').toLowerCase() === 'fallo').length;

      const nextInterventions = instances
        .map((instance: any) => {
          const lastMaintenance = instance.last_maintenance ? new Date(instance.last_maintenance) : null;
          const daysSince = lastMaintenance ? Math.floor((Date.now() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24)) : null;
          return {
            id: instance.id,
            code: instance.code,
            name: instance.name,
            status: instance.status,
            hours: Number(instance.maintenance_hours || 0),
            lastMaintenance: toDate(instance.last_maintenance),
            daysSince,
            vehicle: vehicleMap.get(instance.vehicle_id) || null,
          };
        })
        .sort((a: any, b: any) => (a.daysSince ?? 9999) - (b.daysSince ?? 9999));

      return {
        id: template.id,
        code: template.code,
        name: template.name,
        vehicleType: template.vehicle_type,
        level: template.level,
        description: template.description || null,
        totalInstances: instances.length,
        degraded,
        failures: failure,
        faultModes: faultCount,
        nextInterventions: nextInterventions.slice(0, 5),
      };
    });

    const summary = {
      totalTemplates: majorTemplates.length,
      totalComponents: componentsByTemplate.reduce((sum, item) => sum + item.totalInstances, 0),
      degraded: componentsByTemplate.reduce((sum, item) => sum + item.degraded, 0),
      failures: componentsByTemplate.reduce((sum, item) => sum + item.failures, 0),
    };

    return NextResponse.json({ summary, componentsByTemplate });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar componentes mayores';
    return NextResponse.json({ summary: { totalTemplates: 0, totalComponents: 0, degraded: 0, failures: 0 }, componentsByTemplate: [], error: message }, { status: 500 });
  }
}
