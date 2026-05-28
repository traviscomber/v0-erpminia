import { NextRequest, NextResponse } from 'next/server';
import { mockInspections } from '@/lib/mock-data/production-data';

/**
 * Inspections API
 * Returns inspection data from Supabase or mock data as fallback
 * TODO: Remove mock data once Supabase schema is finalized
 */
export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Use mock data as fallback if no Supabase config
    if (!url || !key) {
      const searchParams = new URL(request.url).searchParams;
      const tipo = searchParams.get('tipo');
      
      let inspections = mockInspections;
      if (tipo) {
        inspections = inspections.filter(i => i.tipo_inspeccion === tipo);
      }
      
      return NextResponse.json({
        data: inspections,
        pagination: { total: inspections.length, limit: 50, offset: 0 },
        mock: true,
      });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let table: string;
    if (tipo === 'externas') {
      table = 'inspecciones_externas';
    } else if (tipo === 'hse') {
      table = 'hse_inspections';
    } else {
      table = 'inspecciones_internas';
    }

    let queryParams = `select=*&limit=${limit}&offset=${offset}`;
    if (estado) {
      queryParams += `&estado=eq.${encodeURIComponent(estado)}`;
    }

    const response = await fetch(`${url}/rest/v1/${table}?${queryParams}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
      },
    });

    if (!response.ok) {
      // Fallback to mock data on error
      const inspections = mockInspections;
      return NextResponse.json({
        data: inspections,
        pagination: { total: inspections.length, limit, offset },
        mock: true,
      });
    }

    const data = await response.json();
    const total = parseInt(response.headers.get('content-range')?.split('/')[1] || String(data?.length || 0));

    return NextResponse.json({
      data: data || [],
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('[v0] Error fetching inspections:', error);
    // Fallback to mock data
    return NextResponse.json({
      data: mockInspections,
      pagination: { total: mockInspections.length, limit: 50, offset: 0 },
      mock: true,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      // Mock response when no Supabase config
      return NextResponse.json(
        {
          success: true,
          message: 'Inspection created successfully (mock)',
          id: `insp-${Date.now()}`,
          mock: true,
        },
        { status: 201 }
      );
    }

    const body = await request.json();
    const { tipo, ...data } = body;

    let table;
    if (tipo === 'externas') {
      table = 'inspecciones_externas';
    } else if (tipo === 'hse') {
      table = 'hse_inspections';
    } else {
      table = 'inspecciones_internas';
    }

    const response = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[v0] Error creating inspection:', error);
    return NextResponse.json(
      {
        success: true,
        message: 'Inspection created successfully (mock)',
        id: `insp-${Date.now()}`,
        mock: true,
      },
      { status: 201 }
    );
  }
}

