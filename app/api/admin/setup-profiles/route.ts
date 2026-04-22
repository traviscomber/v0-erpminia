import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Create profiles table and triggers
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'operador_produccion' NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(email)
        );

        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their own profile"
          ON public.profiles FOR SELECT
          USING (auth.uid() = id);

        CREATE POLICY "Users can update their own profile"
          ON public.profiles FOR UPDATE
          USING (auth.uid() = id);

        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
        BEGIN
          INSERT INTO public.profiles (id, email, full_name, role)
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'role', 'operador_produccion')
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name;
          RETURN NEW;
        END;
        $$;

        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_new_user();

        CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
      `
    });

    if (createTableError) {
      console.error('[v0] Table creation error:', createTableError);
      return NextResponse.json(
        { error: 'Failed to create profiles table', details: createTableError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profiles table created successfully'
    });
  } catch (err) {
    console.error('[v0] Setup profiles error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
