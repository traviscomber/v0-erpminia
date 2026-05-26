import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    // Fetch incidents
    const incidentsResponse = await fetch(
      `${url}/rest/v1/incidents?select=*&order=date_reported.desc&limit=10`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      }
    );

    // Fetch risk matrix
    const riskResponse = await fetch(
      `${url}/rest/v1/risk_matrix?select=*&order=risk_level.desc`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      }
    );

    const incidents = incidentsResponse.ok ? await incidentsResponse.json() : [];
    const riskMatrix = riskResponse.ok ? await riskResponse.json() : [];

    // Format incidents for UI
    const formattedIncidents = incidents.map((inc: any) => ({
      id: inc.id,
      type: inc.incident_type,
      severity: inc.severity === 'alto' ? 'high' : inc.severity === 'medio' ? 'medium' : 'low',
      description: inc.description,
      equipment: inc.location,
      date: new Date(inc.date_reported).toLocaleDateString('es-ES'),
      status: inc.status === 'cerrado' ? 'closed' : inc.status === 'en_investigacion' ? 'investigating' : 'pending_action',
    }));

    // Mock frameworks and other data
    const data = {
      frameworks: [
        { id: 'mineria', name: 'Minería (Regs. Minería)', requirements: 45, incidents: 2, compliance: 98 },
        { id: 'ambiental', name: 'Ambiental', requirements: 32, incidents: 1, compliance: 96 },
        { id: 'laboral', name: 'Laboral', requirements: 28, incidents: 2, compliance: 94 },
      ],
      incidents: formattedIncidents.slice(0, 5),
      requirementsDueData: [
        { name: 'Inspección Anual', count: 3, status: 'on_track' },
        { name: 'Capacitación', count: 5, status: 'warning' },
        { name: 'Monitoreo', count: 2, status: 'on_track' },
      ],
      complianceByFramework: [
        { name: 'Minería', compliance: 98 },
        { name: 'Ambiental', compliance: 96 },
        { name: 'Laboral', compliance: 94 },
      ],
    };

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
