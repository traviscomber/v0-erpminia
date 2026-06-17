export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // hse_master, flujo_sostenibilidad, audit
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let table: string;
    switch (tipo) {
      case 'hse_master':
        table = 'hse_master_documents';
        break;
      case 'flujo_sostenibilidad':
        table = 'flujo_aprobacion_documentos_sostenibilidad';
        break;
      case 'audit':
        table = 'document_audit_log';
        break;
      case 'auditoria_sos':
        table = 'auditoria_documentos_sostenibilidad';
        break;
      default:
        table = 'hse_master_documents';
    }

    let queryParams = `?select=*&limit=${limit}&offset=${offset}`;
    if (estado) {
      queryParams += `&estado=eq.${encodeURIComponent(estado)}`;
    }

    const response = await fetch(`${url}/rest/v1/${table}${queryParams}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Supabase: ${text}` }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({
      data: Array.isArray(data) ? data : [],
      pagination: { total: data.length || 0, limit, offset },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    const body = await request.json();
    const { tipo, ...data } = body;

    let table: string;
    switch (tipo) {
      case 'hse_master':
        table = 'hse_master_documents';
        break;
      case 'flujo_sostenibilidad':
        table = 'flujo_aprobacion_documentos_sostenibilidad';
        break;
      default:
        table = 'hse_master_documents';
    }

    const response = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify([data]),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Supabase: ${text}` }, { status: 500 });
    }

    const result = await response.json();
    return NextResponse.json(result[0] || result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
