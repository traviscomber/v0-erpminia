import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const metadata = {
  title: 'Setup - Admin Only',
};

export default async function SetupPage() {
  // Server-side auth check
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect non-authenticated users
  if (!user) {
    redirect('/auth/login');
  }

  // Check admin role
  const { data: userData } = await supabase
    .from('auth.users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Setup Complete</h1>
      <p className="text-muted-foreground mt-2">Admin access verified.</p>
    </div>
  );
}
