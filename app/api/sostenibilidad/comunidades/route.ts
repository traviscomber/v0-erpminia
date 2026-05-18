import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const { data, error } = await supabase
        .from('comunidades')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    }

    const { data, error } = await supabase
      .from('comunidades')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[v0] Error:', error);
    return NextResponse.json(
      { error: 'Error fetching data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from('comunidades')
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('[v0] Error:', error);
    return NextResponse.json(
      { error: 'Error creating record' },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    const { data, error } = await supabase
      .from('comunidades')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[v0] Error:', error);
    return NextResponse.json(
      { error: 'Error updating record' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const { error } = await supabase
      .from('comunidades')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error:', error);
    return NextResponse.json(
      { error: 'Error deleting record' },
      { status: 400 }
    );
  }
}
